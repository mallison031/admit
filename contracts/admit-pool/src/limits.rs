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
    let _ = (params, good_months);
    todo!("A-2.4")
}

/// Good: raw − outstanding − reserved_for_member; Late: × late_limit_bps; Default or tenure < min: 0.
pub fn limit(member: &Member, params: &PoolParams, reserved_for_member: u128, now_ns: u64) -> u128 {
    let _ = (member, params, reserved_for_member, now_ns);
    todo!("A-2.4")
}

/// reserved + amount ≤ balance × max_exposure_bps / 10_000.
pub fn exposure_ok(pool: &Pool, amount: u128) -> bool {
    let _ = (pool, amount);
    todo!("A-2.4")
}

/// Instant if ≤ limit; Council if ≤ limit × council_tier_multiplier; else Rejected.
pub fn tier(amount: u128, limit: u128, params: &PoolParams) -> Tier {
    let _ = (amount, limit, params);
    todo!("A-2.4")
}

/// Standing derived from contributions vs schedule (Late after one missed period).
pub fn derive_standing(member: &Member, params: &PoolParams, now_ns: u64) -> Standing {
    let _ = (member, params, now_ns);
    todo!("A-4.4")
}

#[cfg(test)]
mod tests {
    // A-2.4: one test per branch, named after the rule, e.g.
    // limit_is_zero_below_min_tenure, late_member_gets_reduced_limit,
    // exposure_rejects_amount_over_cap, tier_rejects_above_council_multiplier.
}
