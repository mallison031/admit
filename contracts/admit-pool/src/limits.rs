//! PURE limit and exposure maths: no `env::` calls; pass `now` and state in. (A-2.4)
//! Mirrored in `packages/core/src/limits.ts`: change both together (AGENTS invariant 8).

use crate::types::{Member, Pool, PoolParams, Standing, Tier};

/// Scaled whole months since `member.joined_at`.
pub fn tenure_months(member: &Member, params: &PoolParams, now_ns: u64) -> u64 {
    let _ = (member, params, now_ns);
    todo!("A-2.4")
}

/// min(tenure_months, contributed / monthly_contribution).
pub fn good_months(member: &Member, params: &PoolParams, now_ns: u64) -> u64 {
    let _ = (member, params, now_ns);
    todo!("A-2.4")
}

/// min(max_limit, base_limit + limit_per_month × good_months).
pub fn raw_limit(params: &PoolParams, good_months: u64) -> u128 {
    let growth = params.limit_per_month.0.saturating_mul(good_months as u128);
    let total = params.base_limit.0.saturating_add(growth);
    total.min(params.max_limit.0)
}

/// Good: raw − outstanding − reserved_for_member; Late: × late_limit_bps; Default or tenure < min: 0.
pub fn limit(member: &Member, params: &PoolParams, reserved_for_member: u128, now_ns: u64) -> u128 {
    let _ = (member, params, reserved_for_member, now_ns);
    todo!("A-2.4")
}

/// reserved + amount ≤ balance × max_exposure_bps / 10_000.
pub fn exposure_ok(pool: &Pool, amount: u128) -> bool {
    let new_reserved = match pool.reserved.0.checked_add(amount) {
        Some(v) => v,
        None => return false,
    };
    let cap = match pool
        .balance
        .0
        .checked_mul(pool.params.max_exposure_bps as u128)
    {
        Some(v) => v / 10_000,
        None => return false,
    };
    new_reserved <= cap
}

/// Instant if ≤ limit; Council if ≤ limit × council_tier_multiplier; else Rejected.
pub fn tier(amount: u128, limit: u128, params: &PoolParams) -> Tier {
    if amount <= limit {
        Tier::Instant
    } else {
        let council_max = limit.saturating_mul(params.council_tier_multiplier as u128);
        if amount <= council_max {
            Tier::Council
        } else {
            Tier::Rejected
        }
    }
}

/// Standing derived from contributions vs schedule (Late after one missed period).
pub fn derive_standing(member: &Member, params: &PoolParams, now_ns: u64) -> Standing {
    let _ = (member, params, now_ns);
    todo!("A-4.4")
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::test_utils::{params, pool};
    use near_sdk::json_types::U128;

    #[test]
    fn raw_limit_grows_per_month() {
        let mut p = params();
        p.base_limit = U128(50);
        p.limit_per_month = U128(25);
        p.max_limit = U128(500);

        assert_eq!(raw_limit(&p, 0), 50);
        assert_eq!(raw_limit(&p, 2), 100);
        assert_eq!(raw_limit(&p, 4), 150);
    }

    #[test]
    fn raw_limit_caps_at_max() {
        let mut p = params();
        p.base_limit = U128(50);
        p.limit_per_month = U128(25);
        p.max_limit = U128(100);

        assert_eq!(raw_limit(&p, 10), 100);
    }

    #[test]
    fn exposure_ok_within_cap() {
        let mut pl = pool(0);
        pl.balance = U128(10_000);
        pl.reserved = U128(2_000);
        pl.params.max_exposure_bps = 8_000; // 80% of 10,000 = 8,000 max reserved

        // 2,000 + 5,000 = 7,000 <= 8,000
        assert!(exposure_ok(&pl, 5_000));
        // 2,000 + 6,000 = 8,000 <= 8,000
        assert!(exposure_ok(&pl, 6_000));
    }

    #[test]
    fn exposure_rejects_amount_over_cap() {
        let mut pl = pool(0);
        pl.balance = U128(10_000);
        pl.reserved = U128(2_000);
        pl.params.max_exposure_bps = 8_000; // 80% = 8,000

        // 2,000 + 6,001 = 8,001 > 8,000
        assert!(!exposure_ok(&pl, 6_001));
    }

    #[test]
    fn tier_instant_within_limit() {
        let mut p = params();
        p.council_tier_multiplier = 3;
        let limit = 100;

        assert_eq!(tier(50, limit, &p), Tier::Instant);
        assert_eq!(tier(100, limit, &p), Tier::Instant);
    }

    #[test]
    fn tier_council_within_multiplier() {
        let mut p = params();
        p.council_tier_multiplier = 3;
        let limit = 100;

        // Above 100 up to 300 is Council
        assert_eq!(tier(101, limit, &p), Tier::Council);
        assert_eq!(tier(300, limit, &p), Tier::Council);
    }

    #[test]
    fn tier_rejects_above_council_multiplier() {
        let mut p = params();
        p.council_tier_multiplier = 3;
        let limit = 100;

        // Above 300 is Rejected
        assert_eq!(tier(301, limit, &p), Tier::Rejected);
    }
}
