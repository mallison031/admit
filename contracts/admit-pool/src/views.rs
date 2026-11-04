//! Read-only views. Cheap and paginated. (A-2.11, A-3.11)

use near_sdk::{near, AccountId};

use crate::types::{Guarantee, GuaranteeId, LimitView, Member, Pool, PoolId, PoolStats};
use crate::{Contract, ContractExt};

#[near]
impl Contract {
    pub fn get_pool(&self, pool_id: PoolId) -> Option<Pool> {
        self.pools.get(&pool_id).cloned()
    }

    pub fn get_pool_stats(&self, pool_id: PoolId) -> PoolStats {
        let _ = pool_id;
        todo!("A-2.11")
    }

    pub fn get_member(&self, pool_id: PoolId, account: AccountId) -> Option<Member> {
        self.members.get(&(pool_id, account)).cloned()
    }

    pub fn list_members(
        &self,
        pool_id: PoolId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<Member> {
        let from = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(50).min(100) as usize;
        let accounts = self.member_index.get(&pool_id).cloned().unwrap_or_default();
        accounts
            .into_iter()
            .skip(from)
            .take(limit)
            .filter_map(|acc| self.members.get(&(pool_id, acc)).cloned())
            .collect()
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

    pub fn list_guarantees(
        &self,
        pool_id: PoolId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<Guarantee> {
        let _ = (pool_id, from_index, limit);
        todo!("A-3.11")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{insert_member, member};

    #[test]
    fn get_pool_returns_none_for_unknown() {
        let contract = Contract::new(None);
        assert!(contract.get_pool(999).is_none());
    }

    #[test]
    fn get_member_returns_inserted_member() {
        let mut contract = Contract::new(None);
        let m = member(0, "alice.near".parse().unwrap());
        insert_member(&mut contract, m.clone());
        let retrieved = contract.get_member(0, "alice.near".parse().unwrap());
        assert_eq!(retrieved, Some(m));
        assert!(contract
            .get_member(0, "bob.near".parse().unwrap())
            .is_none());
    }

    #[test]
    fn list_members_paginates() {
        let mut contract = Contract::new(None);
        for i in 0..5 {
            let acc: AccountId = format!("member{}.near", i).parse().unwrap();
            insert_member(&mut contract, member(0, acc));
        }
        let page1 = contract.list_members(0, Some(0), Some(2));
        assert_eq!(page1.len(), 2);
        assert_eq!(page1[0].account.as_str(), "member0.near");
        assert_eq!(page1[1].account.as_str(), "member1.near");

        let page2 = contract.list_members(0, Some(2), Some(2));
        assert_eq!(page2.len(), 2);
        assert_eq!(page2[0].account.as_str(), "member2.near");
        assert_eq!(page2[1].account.as_str(), "member3.near");

        let page3 = contract.list_members(0, Some(4), Some(2));
        assert_eq!(page3.len(), 1);
        assert_eq!(page3[0].account.as_str(), "member4.near");
    }
}
