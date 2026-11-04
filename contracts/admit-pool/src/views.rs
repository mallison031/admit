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
        let pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| near_sdk::env::panic_str(crate::errors::E01_POOL_NOT_FOUND));
        let member = self
            .members
            .get(&(pool_id, account.clone()))
            .cloned()
            .unwrap_or_else(|| near_sdk::env::panic_str(crate::errors::E24_MEMBER_NOT_FOUND));

        let now_ns = near_sdk::env::block_timestamp();

        let mut reserved_for_member = 0u128;
        for (_, g) in self.guarantees.iter() {
            if g.pool_id == pool_id && g.member == account {
                match g.status {
                    crate::types::GStatus::PendingCouncil
                    | crate::types::GStatus::Issued
                    | crate::types::GStatus::Accepted
                    | crate::types::GStatus::Claimed
                    | crate::types::GStatus::Disputed => {
                        reserved_for_member = reserved_for_member.saturating_add(g.amount.0);
                    }
                    _ => {}
                }
            }
        }

        let lim = crate::limits::limit(&member, &pool.params, reserved_for_member, now_ns);
        let council_tier_max = lim.saturating_mul(pool.params.council_tier_multiplier as u128);

        let blocked_by = Self::check_eligibility(&member, &pool.params, now_ns);
        let eligible = blocked_by.is_none();

        LimitView {
            limit: near_sdk::json_types::U128(lim),
            council_tier_max: near_sdk::json_types::U128(council_tier_max),
            standing: member.standing,
            eligible,
            blocked_by: blocked_by.map(String::from),
        }
    }

    pub(crate) fn check_eligibility(
        member: &Member,
        params: &crate::types::PoolParams,
        now_ns: u64,
    ) -> Option<&'static str> {
        if member.standing == crate::types::Standing::Default {
            return Some("E11_STANDING_DEFAULT");
        }
        let tenure = crate::limits::tenure_months(member, params, now_ns);
        if tenure < params.min_tenure_months as u64 {
            return Some("E07_TENURE_TOO_SHORT");
        }
        let months_paid = member
            .contributed
            .0
            .checked_div(params.monthly_contribution.0)
            .unwrap_or(0) as u64;
        let min_paid = if member.standing == crate::types::Standing::Late {
            tenure.saturating_sub(1)
        } else {
            tenure
        };
        if months_paid < min_paid {
            return Some("E08_CONTRIBUTIONS_UNPAID");
        }
        if member.active_guarantees >= params.max_active_per_member {
            return Some("E09_TOO_MANY_ACTIVE");
        }
        if let Some(last_at) = member.last_guarantee_at {
            let cooldown_scaled = crate::time::scaled(params.cooldown.0, params.time_scale);
            if now_ns < last_at.0.saturating_add(cooldown_scaled) {
                return Some("E10_COOLDOWN");
            }
        }
        None
    }

    /// Used by the QR page (`/g/[id]`).
    pub fn get_guarantee(&self, guarantee_id: GuaranteeId) -> Option<Guarantee> {
        self.guarantees.get(&guarantee_id).cloned()
    }

    pub fn list_guarantees(
        &self,
        pool_id: PoolId,
        from_index: Option<u64>,
        limit: Option<u64>,
    ) -> Vec<Guarantee> {
        let from = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(50).min(100) as usize;
        self.guarantees
            .iter()
            .filter(|(_, g)| g.pool_id == pool_id)
            .map(|(_, g)| g.clone())
            .skip(from)
            .take(limit)
            .collect()
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

    #[test]
    fn get_limit_reports_blocked_by() {
        use crate::time::NS_PER_MONTH;
        use near_sdk::test_utils::VMContextBuilder;
        use near_sdk::testing_env;

        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.params.min_tenure_months = 2;
        p.params.monthly_contribution = U128(10);
        p.params.base_limit = U128(100);
        p.params.limit_per_month = U128(20);
        p.params.council_tier_multiplier = 3;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = near_sdk::json_types::U64(0);
        m.contributed = U128(50);
        insert_member(&mut contract, m.clone());

        // Context at 1 month (less than min_tenure_months = 2)
        let ctx = VMContextBuilder::new()
            .block_timestamp(1 * NS_PER_MONTH)
            .build();
        testing_env!(ctx);

        let view = contract.get_limit(0, "alice.near".parse().unwrap());
        assert_eq!(view.limit.0, 0);
        assert_eq!(view.council_tier_max.0, 0);
        assert!(!view.eligible);
        assert_eq!(view.blocked_by, Some("E07_TENURE_TOO_SHORT".to_string()));

        // Advance to 2 months (tenure passes, contributed 50 >= 2*10=20)
        let ctx = VMContextBuilder::new()
            .block_timestamp(2 * NS_PER_MONTH)
            .build();
        testing_env!(ctx);

        let view2 = contract.get_limit(0, "alice.near".parse().unwrap());
        assert!(view2.eligible);
        assert_eq!(view2.blocked_by, None);
        assert!(view2.limit.0 > 0);
        assert_eq!(view2.council_tier_max.0, view2.limit.0 * 3);

        // Standing default blocks
        m.standing = crate::types::Standing::Default;
        insert_member(&mut contract, m);
        let view3 = contract.get_limit(0, "alice.near".parse().unwrap());
        assert!(!view3.eligible);
        assert_eq!(view3.blocked_by, Some("E11_STANDING_DEFAULT".to_string()));
    }

    #[test]
    fn get_guarantee_returns_inserted() {
        let mut contract = Contract::new(None);
        let g = guarantee(42, crate::types::GStatus::Issued);
        insert_guarantee(&mut contract, g.clone());

        assert_eq!(contract.get_guarantee(42), Some(g));
        assert_eq!(contract.get_guarantee(999), None);
    }

    #[test]
    fn list_guarantees_paginates() {
        let mut contract = Contract::new(None);
        for i in 0..5 {
            let mut g = guarantee(i, crate::types::GStatus::Issued);
            g.pool_id = 0;
            insert_guarantee(&mut contract, g);
        }

        let page1 = contract.list_guarantees(0, Some(0), Some(2));
        assert_eq!(page1.len(), 2);
        assert_eq!(page1[0].id, 0);
        assert_eq!(page1[1].id, 1);

        let page2 = contract.list_guarantees(0, Some(2), Some(2));
        assert_eq!(page2.len(), 2);
        assert_eq!(page2[0].id, 2);
        assert_eq!(page2[1].id, 3);

        let page3 = contract.list_guarantees(0, Some(4), Some(2));
        assert_eq!(page3.len(), 1);
        assert_eq!(page3[0].id, 4);
    }
}
