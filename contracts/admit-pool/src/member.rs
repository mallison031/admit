//! Members: join, delegates, contributions, repayment, exits. (A-2.7, A-2.8, A-4.3, A-4.6)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, require, AccountId};

use crate::errors::{E01_POOL_NOT_FOUND, E24_MEMBER_NOT_FOUND, E28_ALREADY_MEMBER};
use crate::types::{Member, PoolId, Standing};
use crate::{Contract, ContractExt};

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
        let _ = pool_id;
        todo!("A-4.6")
    }

    /// Anyone, after `exit_notice` (E19). Refund = contributed − outstanding, subject to exposure cap.
    pub fn execute_exit(&mut self, pool_id: PoolId, member: AccountId) {
        let _ = (pool_id, member);
        todo!("A-4.6")
    }
}

// Called from ft_on_transfer once dispatch is implemented (A-2.8, A-4.3). Remove the allow once wired.
#[allow(dead_code)]
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
        let _ = (pool_id, member, amount);
        todo!("A-4.3: reduces outstanding; refunds any excess")
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
}
