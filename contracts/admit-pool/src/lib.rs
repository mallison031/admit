//! admit-pool: community pool that issues instant, verifiable hospital-deposit guarantees.
//! Design: ARCHITECTURE.md · Structure: project_structure.md §2.1 · Tasks: ROADMAP.md (P2–P5).

use near_sdk::json_types::U128;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{near, AccountId, BorshStorageKey, PanicOnDefault, PromiseOrValue};

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

use types::{Guarantee, GuaranteeId, Member, Pool, PoolId};

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

    /// NEP-141 receiver. `msg` = `{"contribute": pool_id}` | `{"repay": pool_id}` | `{"topup": pool_id}`.
    /// Accepts only the pool's token (E20). Returns the unused amount. (A-2.8)
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let _ = (sender_id, amount, msg);
        todo!("A-2.8: parse FtMessage and dispatch to member::internal_*")
    }
}
