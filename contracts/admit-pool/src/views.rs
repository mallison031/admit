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
        let pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| near_sdk::env::panic_str(crate::errors::E01_POOL_NOT_FOUND));

        let exposure_bps = pool
            .reserved
            .0
            .saturating_mul(10_000)
            .checked_div(pool.balance.0)
            .unwrap_or(0)
            .min(10_000) as u16;

        let member_count = self
            .member_index
            .get(&pool_id)
            .map(|idx| idx.len() as u64)
            .unwrap_or(0);

        let mut issued = 0u64;
        let mut settled = 0u64;
        for (_, g) in self.guarantees.iter() {
            if g.pool_id == pool_id {
                match g.status {
                    crate::types::GStatus::Issued => issued += 1,
                    crate::types::GStatus::Settled => settled += 1,
                    _ => {}
                }
            }
        }

        let mut defaults = 0u64;
        if let Some(members) = self.member_index.get(&pool_id) {
            for acc in members {
                if let Some(m) = self.members.get(&(pool_id, acc.clone())) {
                    if m.standing == crate::types::Standing::Default {
                        defaults += 1;
                    }
                }
            }
        }

        PoolStats {
            pool_id,
            balance: pool.balance,
            reserved: pool.reserved,
            exposure_bps,
            written_off: pool.written_off,
            members: member_count,
            issued,
            settled,
            defaults,
        }
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
    use crate::test_utils::{
        guarantee, insert_guarantee, insert_member, insert_pool, member, pool,
    };
    use near_sdk::json_types::U128;

    #[test]
    fn pool_stats_counts() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(10_000);
        p.reserved = U128(2_500);
        p.written_off = U128(100);
        insert_pool(&mut contract, p);

        let mut m1 = member(0, "alice.near".parse().unwrap());
        m1.standing = crate::types::Standing::Default;
        insert_member(&mut contract, m1);

        let m2 = member(0, "bob.near".parse().unwrap());
        insert_member(&mut contract, m2);

        let mut g1 = guarantee(0, crate::types::GStatus::Issued);
        g1.pool_id = 0;
        insert_guarantee(&mut contract, g1);

        let mut g2 = guarantee(1, crate::types::GStatus::Settled);
        g2.pool_id = 0;
        insert_guarantee(&mut contract, g2);

        let stats = contract.get_pool_stats(0);
        assert_eq!(stats.pool_id, 0);
        assert_eq!(stats.balance.0, 10_000);
        assert_eq!(stats.reserved.0, 2_500);
        assert_eq!(stats.exposure_bps, 2_500);
        assert_eq!(stats.written_off.0, 100);
        assert_eq!(stats.members, 2);
        assert_eq!(stats.issued, 1);
        assert_eq!(stats.settled, 1);
        assert_eq!(stats.defaults, 1);
    }

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
