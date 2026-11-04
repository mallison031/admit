//! Guarantee requests, council tier, top-ups, expiry. (A-3.1–A-3.5, A-3.9)

use near_sdk::json_types::{U128, U64};
use near_sdk::{env, near, AccountId};

use crate::errors::{
    E01_POOL_NOT_FOUND, E06_HOSPITAL_NOT_REGISTERED, E07_TENURE_TOO_SHORT,
    E08_CONTRIBUTIONS_UNPAID, E09_TOO_MANY_ACTIVE, E10_COOLDOWN, E11_STANDING_DEFAULT,
    E12_OVER_TIER, E13_EXPOSURE_CAP, E14_INVALID_STATUS, E23_GUARANTEE_NOT_FOUND,
    E24_MEMBER_NOT_FOUND, E25_INITIALS_TOO_LONG, E26_NOT_EXPIRED,
};
use crate::types::{
    CryptoHash, GStatus, Guarantee, GuaranteeId, LocalAmount, Member, PoolId, PoolParams, Tier,
};
use crate::{Contract, ContractExt};

pub fn check_initials(patient_initials: Option<&str>) -> Result<(), &'static str> {
    if let Some(initials) = patient_initials {
        if initials.chars().count() > 4 {
            return Err(E25_INITIALS_TOO_LONG);
        }
    }
    Ok(())
}

pub fn check_tenure(member: &Member, params: &PoolParams, now_ns: u64) -> Result<(), &'static str> {
    let tenure = crate::limits::tenure_months(member, params, now_ns);
    if tenure < params.min_tenure_months as u64 {
        return Err(E07_TENURE_TOO_SHORT);
    }
    Ok(())
}

pub fn check_contributions(
    member: &Member,
    params: &PoolParams,
    now_ns: u64,
) -> Result<(), &'static str> {
    let tenure = crate::limits::tenure_months(member, params, now_ns);
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
        return Err(E08_CONTRIBUTIONS_UNPAID);
    }
    Ok(())
}

pub fn check_active_cap(member: &Member, params: &PoolParams) -> Result<(), &'static str> {
    if member.active_guarantees >= params.max_active_per_member {
        return Err(E09_TOO_MANY_ACTIVE);
    }
    Ok(())
}

pub fn check_cooldown(
    member: &Member,
    params: &PoolParams,
    now_ns: u64,
) -> Result<(), &'static str> {
    if let Some(last_at) = member.last_guarantee_at {
        let scaled_cooldown = crate::time::scaled(params.cooldown.0, params.time_scale);
        if now_ns < last_at.0.saturating_add(scaled_cooldown) {
            return Err(E10_COOLDOWN);
        }
    }
    Ok(())
}

#[near]
impl Contract {
    /// Caller ∈ {member, delegates}. Instant → Issued (reserves); Council tier → PendingCouncil;
    /// above tier → E12. Checks: hospital registered, tenure, contributions, active cap, cooldown, exposure.
    #[allow(clippy::too_many_arguments)]
    pub fn request_guarantee(
        &mut self,
        pool_id: PoolId,
        member: AccountId,
        hospital: AccountId,
        amount: U128,
        code_hash: CryptoHash,
        patient_initials: Option<String>,
        local: Option<LocalAmount>,
    ) -> GuaranteeId {
        let mut pool = self
            .pools
            .get(&pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        let member_key = (pool_id, member.clone());
        let mut m = self
            .members
            .get(&member_key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        let requested_by = crate::access::assert_member_or_delegate(&m);

        if !pool.hospitals.iter().any(|h| h.account == hospital) {
            env::panic_str(E06_HOSPITAL_NOT_REGISTERED);
        }

        check_initials(patient_initials.as_deref()).unwrap_or_else(|e| env::panic_str(e));

        let now_ns = env::block_timestamp();
        m.standing = crate::limits::derive_standing(&m, &pool.params, now_ns);

        if m.standing == crate::types::Standing::Default {
            env::panic_str(E11_STANDING_DEFAULT);
        }
        check_tenure(&m, &pool.params, now_ns).unwrap_or_else(|e| env::panic_str(e));
        check_contributions(&m, &pool.params, now_ns).unwrap_or_else(|e| env::panic_str(e));
        check_active_cap(&m, &pool.params).unwrap_or_else(|e| env::panic_str(e));
        check_cooldown(&m, &pool.params, now_ns).unwrap_or_else(|e| env::panic_str(e));

        let mut reserved_for_member = 0u128;
        for (_, other_g) in self.guarantees.iter() {
            if other_g.pool_id == pool_id && other_g.member == member {
                match other_g.status {
                    GStatus::PendingCouncil
                    | GStatus::Issued
                    | GStatus::Accepted
                    | GStatus::Claimed
                    | GStatus::Disputed => {
                        reserved_for_member = reserved_for_member.saturating_add(other_g.amount.0);
                    }
                    _ => {}
                }
            }
        }

        let lim = crate::limits::limit(&m, &pool.params, reserved_for_member, now_ns);
        let tier = crate::limits::tier(amount.0, lim, &pool.params);
        if tier == Tier::Rejected {
            env::panic_str(E12_OVER_TIER);
        }

        let ttl_scaled = crate::time::scaled(pool.params.guarantee_ttl.0, pool.params.time_scale);
        let guarantee_id = self.next_guarantee_id;
        self.next_guarantee_id = self
            .next_guarantee_id
            .checked_add(1)
            .expect("overflow guarantee id");

        let (status, expires_at) = match tier {
            Tier::Instant => {
                if !crate::limits::exposure_ok(&pool, amount.0) {
                    env::panic_str(E13_EXPOSURE_CAP);
                }
                pool.reserved.0 = pool
                    .reserved
                    .0
                    .checked_add(amount.0)
                    .expect("overflow pool reserved");
                crate::events::emit(crate::events::AdmitEvent::GuaranteeIssued {
                    guarantee_id,
                    hospital: hospital.clone(),
                    amount,
                });
                (GStatus::Issued, U64(now_ns.saturating_add(ttl_scaled)))
            }
            Tier::Council => {
                crate::events::emit(crate::events::AdmitEvent::GuaranteeRequested {
                    guarantee_id,
                    pool_id,
                    amount,
                });
                (GStatus::PendingCouncil, U64(0))
            }
            Tier::Rejected => unreachable!(),
        };

        m.active_guarantees = m.active_guarantees.saturating_add(1);
        m.last_guarantee_at = Some(U64(now_ns));

        let g = Guarantee {
            id: guarantee_id,
            pool_id,
            member: member.clone(),
            requested_by,
            patient_initials,
            code_hash,
            hospital,
            amount,
            local,
            status,
            issued_at: U64(now_ns),
            expires_at,
            accepted_at: None,
            claim: None,
            approved_by: None,
            transferred_from: None,
        };

        self.guarantees.insert(guarantee_id, g);
        self.members.insert(member_key, m);
        self.pools.insert(pool_id, pool);

        guarantee_id
    }

    /// Same tier + exposure checks on the new total.
    pub fn request_topup(&mut self, guarantee_id: GuaranteeId, extra: U128) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let mut pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        let member_key = (g.pool_id, g.member.clone());
        let member = self
            .members
            .get(&member_key)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E24_MEMBER_NOT_FOUND));

        crate::access::assert_member_or_delegate(&member);

        if g.status != GStatus::Issued && g.status != GStatus::Accepted {
            env::panic_str(E14_INVALID_STATUS);
        }

        let now_ns = env::block_timestamp();
        let new_amount = g
            .amount
            .0
            .checked_add(extra.0)
            .expect("overflow topup amount");

        let mut other_reserved = 0u128;
        for (_, other_g) in self.guarantees.iter() {
            if other_g.id != guarantee_id
                && other_g.pool_id == g.pool_id
                && other_g.member == g.member
            {
                match other_g.status {
                    GStatus::PendingCouncil
                    | GStatus::Issued
                    | GStatus::Accepted
                    | GStatus::Claimed
                    | GStatus::Disputed => {
                        other_reserved = other_reserved.saturating_add(other_g.amount.0);
                    }
                    _ => {}
                }
            }
        }

        let lim = crate::limits::limit(&member, &pool.params, other_reserved, now_ns);
        let tier = crate::limits::tier(new_amount, lim, &pool.params);
        if tier == Tier::Rejected {
            env::panic_str(E12_OVER_TIER);
        }

        if !crate::limits::exposure_ok(&pool, extra.0) {
            env::panic_str(E13_EXPOSURE_CAP);
        }

        pool.reserved.0 = pool
            .reserved
            .0
            .checked_add(extra.0)
            .expect("overflow pool reservation");
        g.amount = U128(new_amount);

        self.guarantees.insert(guarantee_id, g);
        self.pools.insert(pool.id, pool);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeToppedUp {
            guarantee_id,
            amount: U128(new_amount),
        });
    }

    pub fn council_approve(&mut self, guarantee_id: GuaranteeId) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let mut pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        crate::access::assert_council(&pool);

        if g.status != GStatus::PendingCouncil {
            env::panic_str(E14_INVALID_STATUS);
        }

        if !crate::limits::exposure_ok(&pool, g.amount.0) {
            env::panic_str(E13_EXPOSURE_CAP);
        }

        let caller = env::predecessor_account_id();
        let now_ns = env::block_timestamp();
        let ttl_scaled = crate::time::scaled(pool.params.guarantee_ttl.0, pool.params.time_scale);

        pool.reserved.0 = pool
            .reserved
            .0
            .checked_add(g.amount.0)
            .expect("overflow pool reserved");

        g.status = GStatus::Issued;
        g.approved_by = Some(caller);
        g.expires_at = U64(now_ns.saturating_add(ttl_scaled));

        let hospital = g.hospital.clone();
        let amount = g.amount;
        self.guarantees.insert(guarantee_id, g);
        self.pools.insert(pool.id, pool);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeIssued {
            guarantee_id,
            hospital,
            amount,
        });
    }

    pub fn council_reject(&mut self, guarantee_id: GuaranteeId, reason: String) {
        let _ = reason;
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        let pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        crate::access::assert_council(&pool);

        if g.status != GStatus::PendingCouncil {
            env::panic_str(E14_INVALID_STATUS);
        }

        g.status = GStatus::Rejected;

        let member_key = (g.pool_id, g.member.clone());
        if let Some(mut m) = self.members.get(&member_key).cloned() {
            m.active_guarantees = m.active_guarantees.saturating_sub(1);
            self.members.insert(member_key, m);
        }

        self.guarantees.insert(guarantee_id, g);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeRejected { guarantee_id });
    }

    /// Anyone. Only `Issued` past `expires_at` (E26); frees the reservation.
    pub fn expire(&mut self, guarantee_id: GuaranteeId) {
        let mut g = self
            .guarantees
            .get(&guarantee_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E23_GUARANTEE_NOT_FOUND));

        if g.status != GStatus::Issued {
            env::panic_str(E14_INVALID_STATUS);
        }

        let now_ns = env::block_timestamp();
        if now_ns < g.expires_at.0 {
            env::panic_str(E26_NOT_EXPIRED);
        }

        let mut pool = self
            .pools
            .get(&g.pool_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str(E01_POOL_NOT_FOUND));

        pool.reserved.0 = pool.reserved.0.saturating_sub(g.amount.0);
        g.status = GStatus::Expired;

        let member_key = (g.pool_id, g.member.clone());
        if let Some(mut m) = self.members.get(&member_key).cloned() {
            m.active_guarantees = m.active_guarantees.saturating_sub(1);
            self.members.insert(member_key, m);
        }

        self.guarantees.insert(guarantee_id, g);
        self.pools.insert(pool.id, pool);

        crate::events::emit(crate::events::AdmitEvent::GuaranteeExpired { guarantee_id });
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{
        guarantee, hospital, insert_guarantee, insert_member, insert_pool, member, params, pool,
    };
    use crate::time::NS_PER_MONTH;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    #[test]
    fn check_initials_passes() {
        assert!(check_initials(None).is_ok());
        assert!(check_initials(Some("A")).is_ok());
        assert!(check_initials(Some("ABCD")).is_ok());
    }

    #[test]
    fn check_initials_fails() {
        assert_eq!(check_initials(Some("ABCDE")), Err(E25_INITIALS_TOO_LONG));
    }

    #[test]
    fn check_tenure_passes() {
        let mut p = params();
        p.min_tenure_months = 2;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        assert!(check_tenure(&m, &p, 2 * NS_PER_MONTH).is_ok());
    }

    #[test]
    fn check_tenure_fails() {
        let mut p = params();
        p.min_tenure_months = 2;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        assert_eq!(
            check_tenure(&m, &p, NS_PER_MONTH),
            Err(E07_TENURE_TOO_SHORT)
        );
    }

    #[test]
    fn check_contributions_passes() {
        let mut p = params();
        p.monthly_contribution = U128(10);
        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(30); // 3 months
        assert!(check_contributions(&m, &p, 3 * NS_PER_MONTH).is_ok());

        // Late member with grace
        m.standing = crate::types::Standing::Late;
        m.contributed = U128(20); // 2 months paid, tenure 3 months (grace permits 1 month behind)
        assert!(check_contributions(&m, &p, 3 * NS_PER_MONTH).is_ok());
    }

    #[test]
    fn check_contributions_fails() {
        let mut p = params();
        p.monthly_contribution = U128(10);
        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(10); // 1 month paid, tenure 3 months
        assert_eq!(
            check_contributions(&m, &p, 3 * NS_PER_MONTH),
            Err(E08_CONTRIBUTIONS_UNPAID)
        );
    }

    #[test]
    fn check_active_cap_passes() {
        let mut p = params();
        p.max_active_per_member = 2;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        assert!(check_active_cap(&m, &p).is_ok());
    }

    #[test]
    fn check_active_cap_fails() {
        let mut p = params();
        p.max_active_per_member = 2;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 2;
        assert_eq!(check_active_cap(&m, &p), Err(E09_TOO_MANY_ACTIVE));
    }

    #[test]
    fn check_cooldown_passes() {
        let mut p = params();
        p.cooldown = U64(100);
        p.time_scale = 1;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.last_guarantee_at = Some(U64(1_000));
        assert!(check_cooldown(&m, &p, 1_100).is_ok());
        assert!(check_cooldown(&m, &p, 1_200).is_ok());
    }

    #[test]
    fn check_cooldown_fails() {
        let mut p = params();
        p.cooldown = U64(100);
        p.time_scale = 1;
        let mut m = member(0, "alice.near".parse().unwrap());
        m.last_guarantee_at = Some(U64(1_000));
        assert_eq!(check_cooldown(&m, &p, 1_050), Err(E10_COOLDOWN));
    }

    #[test]
    fn council_approve_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100_000_000);
        p.params.max_exposure_bps = 8_000;
        p.council = vec!["council1.near".parse().unwrap()];
        insert_pool(&mut contract, p);

        let mut g = guarantee(1, GStatus::PendingCouncil);
        g.pool_id = 0;
        g.amount = U128(1_000);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("council1.near".parse().unwrap())
            .block_timestamp(1_000_000)
            .build();
        testing_env!(ctx);

        contract.council_approve(1);

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Issued);
        assert_eq!(updated.approved_by, Some("council1.near".parse().unwrap()));
        assert!(updated.expires_at.0 > 1_000_000);

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.reserved.0, 1_000);
    }

    #[test]
    #[should_panic(expected = "E14_INVALID_STATUS")]
    fn council_approve_rejects_invalid() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.council = vec!["council1.near".parse().unwrap()];
        insert_pool(&mut contract, p);

        let mut g = guarantee(1, GStatus::Issued); // not PendingCouncil
        g.pool_id = 0;
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("council1.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.council_approve(1);
    }

    #[test]
    fn council_reject_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.council = vec!["council1.near".parse().unwrap()];
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        insert_member(&mut contract, m);

        let mut g = guarantee(1, GStatus::PendingCouncil);
        g.pool_id = 0;
        g.member = "alice.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("council1.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.council_reject(1, "Suspect request".to_string());

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Rejected);

        let updated_member = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_member.active_guarantees, 0);
    }

    #[test]
    #[should_panic(expected = "E03_NOT_COUNCIL")]
    fn council_reject_rejects_non_council() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.council = vec!["council1.near".parse().unwrap()];
        insert_pool(&mut contract, p);

        let mut g = guarantee(1, GStatus::PendingCouncil);
        g.pool_id = 0;
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("stranger.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.council_reject(1, "reason".to_string());
    }

    #[test]
    fn expire_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.reserved = U128(1_000);
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.active_guarantees = 1;
        insert_member(&mut contract, m);

        let mut g = guarantee(1, GStatus::Issued);
        g.pool_id = 0;
        g.member = "alice.near".parse().unwrap();
        g.amount = U128(1_000);
        g.expires_at = U64(1_000);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .block_timestamp(1_001) // past expires_at
            .build();
        testing_env!(ctx);

        contract.expire(1);

        let updated = contract.get_guarantee(1).unwrap();
        assert_eq!(updated.status, GStatus::Expired);

        let pl = contract.get_pool(0).unwrap();
        assert_eq!(pl.reserved.0, 0);

        let mem = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(mem.active_guarantees, 0);
    }

    #[test]
    #[should_panic(expected = "E26_NOT_EXPIRED")]
    fn expire_rejects_invalid() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));

        let mut g = guarantee(1, GStatus::Issued);
        g.pool_id = 0;
        g.expires_at = U64(2_000);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .block_timestamp(1_000) // before expires_at
            .build();
        testing_env!(ctx);

        contract.expire(1);
    }

    #[test]
    fn request_topup_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100_000_000);
        p.reserved = U128(100);
        p.params.base_limit = U128(500);
        p.params.max_limit = U128(500);
        p.params.min_tenure_months = 0;
        p.params.max_exposure_bps = 8_000;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        insert_member(&mut contract, m);

        let mut g = guarantee(1, GStatus::Issued);
        g.pool_id = 0;
        g.member = "alice.near".parse().unwrap();
        g.amount = U128(100);
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.request_topup(1, U128(50));

        let updated_g = contract.get_guarantee(1).unwrap();
        assert_eq!(updated_g.amount.0, 150);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.reserved.0, 150);
    }

    #[test]
    #[should_panic(expected = "E14_INVALID_STATUS")]
    fn request_topup_rejects_invalid() {
        let mut contract = Contract::new(None);
        insert_pool(&mut contract, pool(0));
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let mut g = guarantee(1, GStatus::Claimed); // not Issued or Accepted
        g.pool_id = 0;
        g.member = "alice.near".parse().unwrap();
        insert_guarantee(&mut contract, g);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.request_topup(1, U128(50));
    }

    #[test]
    fn request_guarantee_instant_tier_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100_000_000);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.base_limit = U128(100);
        p.params.min_tenure_months = 0;
        p.params.max_exposure_bps = 8_000;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .block_timestamp(1_000_000)
            .build();
        testing_env!(ctx);

        let gid = contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(50),
            [1u8; 32],
            Some("AB".to_string()),
            None,
        );

        assert_eq!(gid, 0);
        let g = contract.get_guarantee(gid).unwrap();
        assert_eq!(g.status, GStatus::Issued);
        assert_eq!(g.amount.0, 50);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.reserved.0, 50);

        let updated_m = contract
            .get_member(0, "alice.near".parse().unwrap())
            .unwrap();
        assert_eq!(updated_m.active_guarantees, 1);
        assert_eq!(updated_m.last_guarantee_at, Some(U64(1_000_000)));
    }

    #[test]
    fn request_guarantee_council_tier_happy_path() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100_000_000);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.base_limit = U128(100);
        p.params.council_tier_multiplier = 3;
        p.params.min_tenure_months = 0;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let gid = contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(200), // > 100 limit, <= 300 council max
            [1u8; 32],
            None,
            None,
        );

        let g = contract.get_guarantee(gid).unwrap();
        assert_eq!(g.status, GStatus::PendingCouncil);
        assert_eq!(g.amount.0, 200);

        let updated_p = contract.get_pool(0).unwrap();
        assert_eq!(updated_p.reserved.0, 0); // Not reserved until approved
    }

    #[test]
    #[should_panic(expected = "E06_HOSPITAL_NOT_REGISTERED")]
    fn request_guarantee_rejects_unregistered_hospital() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![];
        insert_pool(&mut contract, p);
        insert_member(&mut contract, member(0, "alice.near".parse().unwrap()));

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "fake_hospital.near".parse().unwrap(),
            U128(50),
            [1u8; 32],
            None,
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E12_OVER_TIER")]
    fn request_guarantee_rejects_over_tier() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.base_limit = U128(100);
        p.params.council_tier_multiplier = 3;
        p.params.min_tenure_months = 0;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(301), // > 300 council max
            [1u8; 32],
            None,
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E13_EXPOSURE_CAP")]
    fn request_guarantee_rejects_over_exposure_cap() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100);
        p.params.max_exposure_bps = 5_000; // max reserved = 50
        p.reserved = U128(40);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.base_limit = U128(100);
        p.params.min_tenure_months = 0;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        // 40 + 20 = 60 > 50
        contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(20),
            [1u8; 32],
            None,
            None,
        );
    }

    #[test]
    #[should_panic(expected = "E07_TENURE_TOO_SHORT")]
    fn request_guarantee_rejects_ineligible_tenure() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.min_tenure_months = 3;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("alice.near".parse().unwrap())
            .block_timestamp(NS_PER_MONTH) // 1 < 3
            .build();
        testing_env!(ctx);

        contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(10),
            [1u8; 32],
            None,
            None,
        );
    }

    #[test]
    fn request_guarantee_by_delegate() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.balance = U128(100_000_000);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        p.params.base_limit = U128(100);
        p.params.min_tenure_months = 0;
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.joined_at = U64(0);
        m.contributed = U128(100);
        m.delegates = vec!["phone.near".parse().unwrap()];
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("phone.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        let gid = contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(50),
            [1u8; 32],
            None,
            None,
        );

        let g = contract.get_guarantee(gid).unwrap();
        assert_eq!(g.requested_by, "phone.near".parse::<AccountId>().unwrap());
    }

    #[test]
    #[should_panic(expected = "E05_NOT_MEMBER_OR_DELEGATE")]
    fn request_guarantee_rejects_non_delegate() {
        let mut contract = Contract::new(None);
        let mut p = pool(0);
        p.hospitals = vec![hospital("hospital.near".parse().unwrap())];
        insert_pool(&mut contract, p);

        let mut m = member(0, "alice.near".parse().unwrap());
        m.delegates = vec!["phone.near".parse().unwrap()];
        insert_member(&mut contract, m);

        let ctx = VMContextBuilder::new()
            .predecessor_account_id("stranger.near".parse().unwrap())
            .build();
        testing_env!(ctx);

        contract.request_guarantee(
            0,
            "alice.near".parse().unwrap(),
            "hospital.near".parse().unwrap(),
            U128(50),
            [1u8; 32],
            None,
            None,
        );
    }
}
