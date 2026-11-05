//! admit-pool: community pool that issues instant, verifiable hospital-deposit guarantees.
//! Design: ARCHITECTURE.md · Structure: project_structure.md §2.1 · Tasks: ROADMAP.md (P2–P5).

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{env, near, serde_json, AccountId, BorshStorageKey, PanicOnDefault, PromiseOrValue};

pub mod access;
pub mod council;
pub mod errors;
pub mod events;
pub mod guarantee;
pub mod hospital;
pub mod limits;
pub mod member;
pub mod pool;
pub mod settle;
pub mod time;
pub mod token;
pub mod types;
pub mod views;

#[cfg(test)]
pub mod test_utils;

use errors::{E01_POOL_NOT_FOUND, E20_WRONG_TOKEN, E27_NOT_AI_REVIEWER, E29_INVALID_MESSAGE};
use types::{FtMessage, Guarantee, GuaranteeId, Member, Pool, PoolId};

#[near(serializers = [borsh])]
#[derive(BorshStorageKey)]
pub enum StorageKey {
    Pools,
    Members,
    MemberIndex,
    Guarantees,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    pub(crate) pools: IterableMap<PoolId, Pool>,
    pub(crate) members: LookupMap<(PoolId, AccountId), Member>,
    pub(crate) member_index: LookupMap<PoolId, Vec<AccountId>>,
    pub(crate) guarantees: IterableMap<GuaranteeId, Guarantee>,
    /// Account allowed to call `post_ai_review` (Could, A-12.1).
    pub(crate) ai_reviewer: Option<AccountId>,
    pub(crate) next_pool_id: PoolId,
    pub(crate) next_guarantee_id: GuaranteeId,
}

#[near]
impl Contract {
    #[init]
    pub fn new(ai_reviewer: Option<AccountId>) -> Self {
        Self {
            pools: IterableMap::new(StorageKey::Pools),
            members: LookupMap::new(StorageKey::Members),
            member_index: LookupMap::new(StorageKey::MemberIndex),
            guarantees: IterableMap::new(StorageKey::Guarantees),
            ai_reviewer,
            next_pool_id: 0,
            next_guarantee_id: 0,
        }
    }

    /// Returns the active AI reviewer account, if configured (Could, A-12.1).
    pub fn get_ai_reviewer(&self) -> Option<AccountId> {
        self.ai_reviewer.clone()
    }

    /// Sets or updates the AI reviewer account. Callable by pool DAOs, the contract itself, or current reviewer.
    pub fn set_ai_reviewer(&mut self, reviewer: Option<AccountId>) {
        let caller = env::predecessor_account_id();
        let is_dao = self.pools.iter().any(|(_, pool)| pool.dao == caller);
        let is_current = self.ai_reviewer.as_ref() == Some(&caller);
        let is_self = caller == env::current_account_id();

        if !is_dao && !is_current && !is_self {
            env::panic_str(E27_NOT_AI_REVIEWER);
        }
        self.ai_reviewer = reviewer;
    }

    /// NEP-141 receiver. `msg` = `{"contribute": pool_id}` | `{"repay": pool_id}` | `{"topup": pool_id}`.
    /// Accepts only the pool's token (E20). Returns the unused amount. (A-2.8)
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let parsed = parse_ft_message(&msg);
        let pool_id = match parsed {
            FtMessage::Contribute(id) => id,
            FtMessage::Repay(id) => id,
            FtMessage::Topup(id) => id,
        };

        let pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        if env::predecessor_account_id() != pool.token {
            env::panic_str(E20_WRONG_TOKEN);
        }

        let unused = match parsed {
            FtMessage::Contribute(id) => self.internal_contribute(id, sender_id, amount),
            FtMessage::Repay(id) => self.internal_repay(id, sender_id, amount),
            FtMessage::Topup(id) => self.internal_topup(id, sender_id, amount),
        };

        PromiseOrValue::Value(unused)
    }
}

pub(crate) fn parse_ft_message(msg: &str) -> FtMessage {
    serde_json::from_str::<FtMessage>(msg).unwrap_or_else(|_| env::panic_str(E29_INVALID_MESSAGE))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_contribute() {
        assert_eq!(
            parse_ft_message(r#"{"contribute":0}"#),
            FtMessage::Contribute(0)
        );
    }

    #[test]
    fn parses_repay() {
        assert_eq!(parse_ft_message(r#"{"repay":42}"#), FtMessage::Repay(42));
    }

    #[test]
    fn parses_topup() {
        assert_eq!(parse_ft_message(r#"{"topup":7}"#), FtMessage::Topup(7));
    }

    #[test]
    #[should_panic(expected = "E29_INVALID_MESSAGE")]
    fn rejects_garbage() {
        parse_ft_message("not valid json");
    }

    #[test]
    fn ft_on_transfer_contribute() {
        use crate::test_utils::{insert_member, insert_pool, member, pool};
        use near_sdk::test_utils::VMContextBuilder;
        use near_sdk::testing_env;

        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.token = "usdc.near".parse().unwrap();
        insert_pool(&mut contract, p);
        let mut m = member(0, "alice.near".parse().unwrap());
        m.contributed = U128(0);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("usdc.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let res = contract.ft_on_transfer(
            "alice.near".parse().unwrap(),
            U128(50),
            r#"{"contribute":0}"#.to_string(),
        );

        match res {
            PromiseOrValue::Value(unused) => assert_eq!(unused.0, 0),
            _ => panic!("expected PromiseOrValue::Value"),
        }

        let m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(m.contributed.0, 50);
    }

    #[test]
    fn ft_on_transfer_repay() {
        use crate::test_utils::{insert_member, insert_pool, member, pool};
        use near_sdk::test_utils::VMContextBuilder;
        use near_sdk::testing_env;

        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.token = "usdc.near".parse().unwrap();
        insert_pool(&mut contract, p);
        let mut m = member(0, "alice.near".parse().unwrap());
        m.outstanding = U128(30);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("usdc.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let res = contract.ft_on_transfer(
            "alice.near".parse().unwrap(),
            U128(50),
            r#"{"repay":0}"#.to_string(),
        );

        match res {
            PromiseOrValue::Value(unused) => assert_eq!(unused.0, 20),
            _ => panic!("expected PromiseOrValue::Value"),
        }

        let m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(m.outstanding.0, 0);
    }

    #[test]
    fn ft_on_transfer_topup() {
        use crate::test_utils::{insert_pool, pool};
        use near_sdk::test_utils::VMContextBuilder;
        use near_sdk::testing_env;

        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.token = "usdc.near".parse().unwrap();
        let initial_balance = p.balance.0;
        insert_pool(&mut contract, p);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("usdc.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let res = contract.ft_on_transfer(
            "funder.near".parse().unwrap(),
            U128(100),
            r#"{"topup":0}"#.to_string(),
        );

        match res {
            PromiseOrValue::Value(unused) => assert_eq!(unused.0, 0),
            _ => panic!("expected PromiseOrValue::Value"),
        }

        let p = contract.get_pool(0).unwrap();
        assert_eq!(p.balance.0, initial_balance + 100);
    }

    #[test]
    #[should_panic(expected = "E20_WRONG_TOKEN")]
    fn ft_on_transfer_rejects_wrong_token() {
        use crate::test_utils::{insert_pool, pool};
        use near_sdk::test_utils::VMContextBuilder;
        use near_sdk::testing_env;

        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.token = "usdc.near".parse().unwrap();
        insert_pool(&mut contract, p);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("scam_token.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let _ = contract.ft_on_transfer(
            "alice.near".parse().unwrap(),
            U128(50),
            r#"{"contribute":0}"#.to_string(),
        );
    }
}
