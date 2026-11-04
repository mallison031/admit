//! Read-only views. Cheap and paginated. (A-2.11, A-3.11)

use near_sdk::{near, AccountId};

use crate::types::{Guarantee, GuaranteeId, LimitView, Member, Pool, PoolId, PoolStats};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn get_pool(&self, pool_id: PoolId) -> Option<Pool> {
        let _ = pool_id;
        todo!("A-2.11")
    }

    pub fn get_pool_stats(&self, pool_id: PoolId) -> PoolStats {
        let _ = pool_id;
        todo!("A-2.11")
    }

    pub fn get_member(&self, pool_id: PoolId, account: AccountId) -> Option<Member> {
        let _ = (pool_id, account);
        todo!("A-2.11")
    }

    pub fn list_members(&self, pool_id: PoolId, from_index: Option<u64>, limit: Option<u64>) -> Vec<Member> {
        let _ = (pool_id, from_index, limit);
        todo!("A-2.11")
    }

    pub fn get_limit(&self, pool_id: PoolId, account: AccountId) -> LimitView {
        let _ = (pool_id, account);
        todo!("A-2.11")
    }

    /// Used by the QR page (`/g/[id]`).
    pub fn get_guarantee(&self, guarantee_id: GuaranteeId) -> Option<Guarantee> {
        let _ = guarantee_id;
        todo!("A-3.11")
    }

    pub fn list_guarantees(&self, pool_id: PoolId, from_index: Option<u64>, limit: Option<u64>) -> Vec<Guarantee> {
        let _ = (pool_id, from_index, limit);
        todo!("A-3.11")
    }
}
