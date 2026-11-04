//! Data model for `admit-pool`. Source of truth: ARCHITECTURE.md §4.
//! Mirrored in `packages/core/src/types.ts`: change both together.
//!
//! JSON conventions:
//! - Token amounts are `U128` (decimal strings).
//! - Timestamps and durations are `U64` nanoseconds (decimal strings), because JS can't hold u64 exactly.
//! - Ids (`PoolId`, `GuaranteeId`) are plain numbers.
//! - Hashes are `[u8; 32]` (JSON array of 32 numbers).

use near_sdk::json_types::{U128, U64};
use near_sdk::{near, AccountId, PublicKey};

pub type PoolId = u64;
pub type GuaranteeId = u64;
pub type BasisPoints = u16;
pub type CryptoHash = [u8; 32];

/// Pool configuration. Set at `create_pool`; changed only by the DAO (`council_set_params`),
/// except `time_scale`, which is immutable.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct PoolParams {
    pub monthly_contribution: U128,
    pub min_tenure_months: u8,
    /// Calibrate to real deposit sizes (A-0.7).
    pub base_limit: U128,
    pub limit_per_month: U128,
    pub max_limit: U128,
    /// Limit multiplier for `Late` members (1-month grace), e.g. 5000 = 50%.
    pub late_limit_bps: BasisPoints,
    /// `reserved + amount ≤ balance × max_exposure_bps / 10_000`.
    pub max_exposure_bps: BasisPoints,
    pub max_active_per_member: u8,
    pub cooldown: U64,
    /// Expiry for guarantees that haven't been accepted. Accepted guarantees never expire.
    pub guarantee_ttl: U64,
    pub dispute_window: U64,
    /// Share of a settled bill the pool absorbs. Default 0 (credit line, not insurance).
    pub pool_covered_bps: BasisPoints,
    pub cover_on_death: bool,
    /// Council tier upper bound = limit × this.
    pub council_tier_multiplier: u8,
    pub exit_lock_months: u8,
    pub exit_notice: U64,
    /// 1 = real time; >1 = demo mode. Immutable.
    pub time_scale: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Hospital {
    pub account: AccountId,
    pub name: String,
    /// Function-call key on the hospital account, scoped to the hospital_* methods (used via relayer).
    pub fc_public_key: PublicKey,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Pool {
    pub id: PoolId,
    pub name: String,
    pub dao: AccountId,
    pub token: AccountId,
    pub params: PoolParams,
    /// Set only by the DAO.
    pub council: Vec<AccountId>,
    /// Set only by the DAO.
    pub hospitals: Vec<Hospital>,
    pub balance: U128,
    pub reserved: U128,
    pub written_off: U128,
    pub created_at: U64,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Standing {
    Good,
    Late,
    Default,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Member {
    pub account: AccountId,
    pub pool_id: PoolId,
    pub joined_at: U64,
    /// months_paid = contributed / monthly_contribution
    pub contributed: U128,
    /// Debt from settled guarantees.
    pub outstanding: U128,
    pub standing: Standing,
    pub active_guarantees: u8,
    pub last_guarantee_at: Option<U64>,
    /// Implicit accounts holding function-call keys (device phones).
    pub delegates: Vec<AccountId>,
    pub exit_requested_at: Option<U64>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum GStatus {
    PendingCouncil,
    Issued,
    Accepted,
    Claimed,
    Disputed,
    Settled,
    Released,
    Expired,
    Rejected,
    /// Debt from this guarantee was written off (death or council write-off).
    WrittenOff,
}

/// Local-currency amount recorded at issue. Informational only; never used in maths.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct LocalAmount {
    /// ISO 4217, e.g. "NGN".
    pub currency: String,
    /// Minor units of the local currency.
    pub amount: U128,
    /// Token→local rate × 1e6 at issue.
    pub fx_rate_e6: U64,
}

/// Advisory AI bill check (Could, A-12.1). Never affects payouts directly.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct AiReview {
    pub verdict: String,
    pub flagged_lines: u8,
    pub report_hash: CryptoHash,
    pub signing_address: String,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Claim {
    pub amount: U128,
    pub file_hash: CryptoHash,
    pub claimed_at: U64,
    /// Member's dispute reason, if disputed within the window.
    pub dispute: Option<String>,
    pub adjustment: U128,
    pub adjustment_reason: Option<String>,
    pub paid: U128,
    pub ai_review: Option<AiReview>,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug, PartialEq)]
pub struct Guarantee {
    pub id: GuaranteeId,
    pub pool_id: PoolId,
    pub member: AccountId,
    pub requested_by: AccountId,
    /// Optional, ≤ 4 characters. No names, IDs or diagnoses on-chain.
    pub patient_initials: Option<String>,
    /// sha256(code ‖ guarantee_id); the 6-char code itself never goes on-chain.
    pub code_hash: CryptoHash,
    pub hospital: AccountId,
    /// Reserved amount; can grow via top-up.
    pub amount: U128,
    pub local: Option<LocalAmount>,
    pub status: GStatus,
    pub issued_at: U64,
    /// Ignored once accepted.
    pub expires_at: U64,
    pub accepted_at: Option<U64>,
    pub claim: Option<Claim>,
    /// Council member who approved a council-tier request.
    pub approved_by: Option<AccountId>,
    /// Set on the new guarantee created by `hospital_transfer`.
    pub transferred_from: Option<GuaranteeId>,
}

/// Approval tier for a requested amount (ARCHITECTURE §4, Derived).
#[near(serializers = [json])]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Tier {
    Instant,
    Council,
    /// Above the council tier: Admit is for emergency deposits only.
    Rejected,
}

/// `ft_on_transfer` message, e.g. `{"contribute": 0}`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FtMessage {
    Contribute(PoolId),
    Repay(PoolId),
    Topup(PoolId),
}

/// Returned by `get_pool_stats`.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct PoolStats {
    pub pool_id: PoolId,
    pub balance: U128,
    pub reserved: U128,
    pub exposure_bps: BasisPoints,
    pub written_off: U128,
    pub members: u64,
    pub issued: u64,
    pub settled: u64,
    pub defaults: u64,
}

/// Returned by `get_limit`: what a member can request right now, and why not if blocked.
#[near(serializers = [json])]
#[derive(Clone, Debug, PartialEq)]
pub struct LimitView {
    pub limit: U128,
    pub council_tier_max: U128,
    pub standing: Standing,
    pub eligible: bool,
    /// Error code of the first failed eligibility check, e.g. "E07_TENURE_TOO_SHORT".
    pub blocked_by: Option<String>,
}
