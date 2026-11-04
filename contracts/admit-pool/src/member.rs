//! Members: join, delegates, contributions, repayment, exits. (A-2.7, A-2.8, A-4.3, A-4.6)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId, Promise};

use crate::errors::{
    E01_POOL_NOT_FOUND, E13_EXPOSURE_CAP, E18_EXIT_LOCKED, E19_EXIT_NOTICE, E24_MEMBER_NOT_FOUND,
    E28_ALREADY_MEMBER,
};
use crate::limits;
use crate::time;
use crate::types::{Member, PoolId, Standing};
use crate::{Contract, ContractExt};

/// Refund = contributed − outstanding (saturating at 0). (A-4.6)
pub fn exit_refund(contributed: u128, outstanding: u128) -> u128 {
    contributed.saturating_sub(outstanding)
}

#[near]
impl Contract {
    #[payable]
    pub fn join(&mut self, pool_id: PoolId) {
        let caller = env::predecessor_account_id();
        require!(self.pools.contains_key(&pool_id), E01_POOL_NOT_FOUND);
        let key = (pool_id, caller.clone());
        require!(!self.members.contains_key(&key), E28_ALREADY_MEMBER);

        let member = Member {
            account: caller.clone(),
            pool_id,
            joined_at: U64(env::block_timestamp()),
            contributed: U128(0),
            outstanding: U128(0),
            standing: Standing::Good,
            active_guarantees: 0,
            last_guarantee_at: None,
            delegates: vec![],
            exit_requested_at: None,
        };
        self.members.insert(key, member);

        let mut index = self.member_index.get(&pool_id).cloned().unwrap_or_default();
        index.push(caller.clone());
        self.member_index.insert(pool_id, index);

        crate::events::emit(crate::events::AdmitEvent::MemberJoined {
            pool_id,
            member: caller,
        });
    }

    /// Adds a device implicit account that may request guarantees for this member.
    pub fn add_delegate(&mut self, pool_id: PoolId, delegate: AccountId) {
        let caller = env::predecessor_account_id();
        let key = (pool_id, caller);
        let mut member = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        if !member.delegates.contains(&delegate) {
            member.delegates.push(delegate);
        }
        self.members.insert(key, member);
    }

    pub fn remove_delegate(&mut self, pool_id: PoolId, delegate: AccountId) {
        let caller = env::predecessor_account_id();
        let key = (pool_id, caller);
        let mut member = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        member.delegates.retain(|d| d != &delegate);
        self.members.insert(key, member);
    }

    /// Allowed after `exit_lock_months` (E18).
    pub fn request_exit(&mut self, pool_id: PoolId) {
        let caller = env::predecessor_account_id();
        let pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        let key = (pool_id, caller.clone());
        let mut member = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let now = env::block_timestamp();
        let tenure = limits::tenure_months(&member, &pool.params, now);
        require!(
            tenure >= pool.params.exit_lock_months as u64,
            E18_EXIT_LOCKED
        );

        member.exit_requested_at = Some(U64(now));
        self.members.insert(key, member);

        crate::events::emit(crate::events::AdmitEvent::ExitRequested {
            pool_id,
            member: caller,
        });
    }

    /// Anyone, after `exit_notice` (E19). Refund = contributed − outstanding, subject to exposure cap.
    pub fn execute_exit(&mut self, pool_id: PoolId, member: AccountId) -> Promise {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        let key = (pool_id, member.clone());
        let member_record = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let exit_requested_at = member_record
            .exit_requested_at
            .unwrap_or_else(|| env::panic_str(E19_EXIT_NOTICE))
            .0;
        let notice_duration = time::scaled(pool.params.exit_notice.0, pool.params.time_scale);
        let eligible_at = exit_requested_at.saturating_add(notice_duration);
        require!(env::block_timestamp() >= eligible_at, E19_EXIT_NOTICE);

        let refund = exit_refund(member_record.contributed.0, member_record.outstanding.0);

        let new_balance = pool.balance.0.saturating_sub(refund);
        let cap = new_balance
            .saturating_mul(pool.params.max_exposure_bps as u128)
            .checked_div(10_000)
            .unwrap_or(0);
        require!(pool.reserved.0 <= cap, E13_EXPOSURE_CAP);

        pool.balance.0 = new_balance;
        self.pools.insert(pool_id, pool.clone());
        self.members.remove(&key);

        crate::events::emit(crate::events::AdmitEvent::ExitExecuted {
            pool_id,
            member: member.clone(),
            refund: U128(refund),
        });

        self.ft_transfer(pool.token, member, U128(refund)).then(
            Self::ext(env::current_account_id()).on_exit_refunded(
                pool_id,
                member_record,
                U128(refund),
            ),
        )
    }
}

// Called from ft_on_transfer (A-2.8, A-4.3).
impl Contract {
    pub(crate) fn internal_contribute(
        &mut self,
        pool_id: PoolId,
        member: AccountId,
        amount: U128,
    ) -> U128 {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        let key = (pool_id, member.clone());
        let mut m = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        m.contributed.0 = m
            .contributed
            .0
            .checked_add(amount.0)
            .expect("overflow contributed");
        pool.balance.0 = pool
            .balance
            .0
            .checked_add(amount.0)
            .expect("overflow pool balance");

        self.members.insert(key, m);
        self.pools.insert(pool_id, pool);

        crate::events::emit(crate::events::AdmitEvent::Contribution {
            pool_id,
            member,
            amount,
        });

        U128(0)
    }

    pub(crate) fn internal_repay(
        &mut self,
        pool_id: PoolId,
        member: AccountId,
        amount: U128,
    ) -> U128 {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));
        let key = (pool_id, member.clone());
        let mut m = self
            .members
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let repaid = m.outstanding.0.min(amount.0);
        let excess = amount.0.saturating_sub(repaid);

        m.outstanding.0 = m.outstanding.0.saturating_sub(repaid);
        pool.balance.0 = pool.balance.0.saturating_add(repaid);

        if m.outstanding.0 == 0 && m.standing == Standing::Late {
            m.standing = Standing::Good;
            crate::events::emit(crate::events::AdmitEvent::StandingChanged {
                pool_id,
                member: member.clone(),
                standing: Standing::Good,
            });
        }

        self.members.insert(key, m);
        self.pools.insert(pool_id, pool);

        crate::events::emit(crate::events::AdmitEvent::Repayment {
            pool_id,
            member,
            amount: U128(repaid),
        });

        U128(excess)
    }

    pub(crate) fn internal_topup(
        &mut self,
        pool_id: PoolId,
        from: AccountId,
        amount: U128,
    ) -> U128 {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        pool.balance.0 = pool
            .balance
            .0
            .checked_add(amount.0)
            .expect("overflow pool balance");
        self.pools.insert(pool_id, pool);

        crate::events::emit(crate::events::AdmitEvent::Topup {
            pool_id,
            from,
            amount,
        });

        U128(0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{insert_member, insert_pool, member, pool};
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn set_predecessor(caller: &str) {
        let ctx = VMContextBuilder::new()
            .predecessor_account_id(caller.parse().unwrap())
            .build();
        testing_env!(ctx);
    }

    #[test]
    fn join_happy_path() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("alice.near");
        contract.join(0);

        let m = contract.get_member(0, "alice.near".parse().unwrap());
        assert!(m.is_some());
        let m = m.unwrap();
        assert_eq!(m.account.as_str(), "alice.near");
        assert_eq!(m.standing, Standing::Good);

        let members = contract.list_members(0, None, None);
        assert_eq!(members.len(), 1);
        assert_eq!(members[0].account.as_str(), "alice.near");
    }

    #[test]
    #[should_panic(expected = "E28_ALREADY_MEMBER")]
    fn join_twice_fails() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("alice.near");
        contract.join(0);
        contract.join(0);
    }

    #[test]
    fn add_delegate_stores_delegate() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        set_predecessor("alice.near");
        contract.add_delegate(0, "device.near".parse().unwrap());

        let m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(
            m.delegates,
            vec!["device.near".parse::<AccountId>().unwrap()]
        );
    }

    #[test]
    #[should_panic(expected = "E24_MEMBER_NOT_FOUND")]
    fn add_delegate_requires_member() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        set_predecessor("stranger.near");
        contract.add_delegate(0, "device.near".parse().unwrap());
    }

    #[test]
    fn remove_delegate_clears_delegate() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        let mut m = member(0, "alice.near".parse().unwrap());
        m.delegates = vec!["device.near".parse().unwrap()];
        insert_member(&mut contract, m);

        set_predecessor("alice.near");
        contract.remove_delegate(0, "device.near".parse().unwrap());

        let m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert!(m.delegates.is_empty());
    }

    #[test]
    fn internal_contribute_updates_contributed_and_balance() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let initial_balance = contract.get_pool(0).unwrap().balance.0;
        let initial_contributed = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap()
            .contributed
            .0;

        let unused =
            contract.internal_contribute(0, "alice.near".parse().unwrap(), U128(50_000_000));
        assert_eq!(unused.0, 0);

        let new_pool = contract.get_pool(0).unwrap();
        assert_eq!(new_pool.balance.0, initial_balance + 50_000_000);

        let new_member = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(new_member.contributed.0, initial_contributed + 50_000_000);
    }

    #[test]
    fn internal_topup_updates_balances() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        let initial_balance = contract.get_pool(0).unwrap().balance.0;

        let unused = contract.internal_topup(0, "funder.near".parse().unwrap(), U128(100_000_000));
        assert_eq!(unused.0, 0);

        let new_pool = contract.get_pool(0).unwrap();
        assert_eq!(new_pool.balance.0, initial_balance + 100_000_000);
    }

    #[test]
    fn repay_reduces_debt() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        let mut m = member(0, "alice.near".parse().unwrap());
        m.outstanding = U128(100);
        m.standing = Standing::Late;
        insert_member(&mut contract, m);

        let unused = contract.internal_repay(0, "alice.near".parse().unwrap(), U128(100));
        assert_eq!(unused.0, 0);

        let updated = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated.outstanding.0, 0);
        assert_eq!(updated.standing, Standing::Good);
    }

    #[test]
    fn repay_refunds_excess() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        let mut m = member(0, "alice.near".parse().unwrap());
        m.outstanding = U128(40);
        insert_member(&mut contract, m);

        let unused = contract.internal_repay(0, "alice.near".parse().unwrap(), U128(100));
        assert_eq!(unused.0, 60);

        let updated = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated.outstanding.0, 0);
    }

    #[test]
    fn exit_refund_with_no_debt() {
        assert_eq!(exit_refund(100, 0), 100);
    }

    #[test]
    fn exit_refund_reduced_by_debt() {
        assert_eq!(exit_refund(100, 30), 70);
    }

    #[test]
    fn exit_refund_debt_exceeds_contributions() {
        assert_eq!(exit_refund(100, 150), 0);
    }

    #[test]
    fn request_exit_after_lock() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.params.exit_lock_months = 12;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(1_000);
        insert_member(&mut contract, m);

        let now = 1_000 + 12 * crate::time::NS_PER_MONTH;
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .block_timestamp(now)
            .build());

        contract.request_exit(0);

        let updated = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated.exit_requested_at, Some(U64(now)));
    }

    #[test]
    #[should_panic(expected = "E18_EXIT_LOCKED")]
    fn request_exit_before_lock_fails() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.params.exit_lock_months = 12;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(1_000);
        insert_member(&mut contract, m);

        // Only 5 months passed
        let now = 1_000 + 5 * crate::time::NS_PER_MONTH;
        testing_env!(VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .block_timestamp(now)
            .build());

        contract.request_exit(0);
    }

    #[test]
    fn execute_exit_after_notice_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        let notice = p.params.exit_notice.0;
        p.balance = U128(1_000_000_000);
        p.reserved = U128(0);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.contributed = U128(120_000_000);
        m.outstanding = U128(20_000_000);
        m.exit_requested_at = Some(U64(1_000));
        insert_member(&mut contract, m);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + notice + 10)
            .build());

        let _promise = contract.execute_exit(0, "alice.near".parse().unwrap());

        // Member is removed
        assert!(contract
            .get_member(0, "alice.near".parse().unwrap())
            .is_none());

        // Balance reduced by refund (120 - 20 = 100)
        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.balance.0, 900_000_000);
    }

    #[test]
    #[should_panic(expected = "E19_EXIT_NOTICE")]
    fn execute_exit_before_notice_fails() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        let mut m = member(0, "alice.near".parse().unwrap());
        m.exit_requested_at = Some(U64(1_000));
        insert_member(&mut contract, m);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + 100)
            .build());

        let _ = contract.execute_exit(0, "alice.near".parse().unwrap());
    }

    #[test]
    #[should_panic(expected = "E19_EXIT_NOTICE")]
    fn execute_exit_without_request_fails() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(100_000)
            .build());

        let _ = contract.execute_exit(0, "alice.near".parse().unwrap());
    }

    #[test]
    #[should_panic(expected = "E13_EXPOSURE_CAP")]
    fn execute_exit_exposure_cap_blocks() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        let notice = p.params.exit_notice.0;
        // Balance 100M, max_exposure_bps = 8000 (80%).
        // Reserved is 75M.
        // If member refund is 10M, new balance is 90M, cap = 90M * 80% = 72M.
        // 75M > 72M -> exposure cap exceeded!
        p.balance = U128(100_000_000);
        p.reserved = U128(75_000_000);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.contributed = U128(10_000_000);
        m.outstanding = U128(0);
        m.exit_requested_at = Some(U64(1_000));
        insert_member(&mut contract, m);

        testing_env!(VMContextBuilder::new()
            .current_account_id("pool.near".parse().unwrap())
            .predecessor_account_id("stranger.near".parse().unwrap())
            .block_timestamp(1_000 + notice + 10)
            .build());

        let _ = contract.execute_exit(0, "alice.near".parse().unwrap());
    }
}
