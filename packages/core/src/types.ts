// TS mirror of contracts/admit-pool/src/types.rs (ARCHITECTURE §4). Change both together.
// JSON: U128/U64 are decimal strings; ids are numbers; hashes are number[32]; Option<T> is T | null.
import { z } from "zod";

export const U128 = z.string().regex(/^\d+$/, "U128 decimal string");
export const U64 = z.string().regex(/^\d+$/, "U64 decimal string");
export const AccountId = z.string().min(2).max(64);
export const CryptoHash = z.array(z.number().int().min(0).max(255)).length(32);
export const BasisPoints = z.number().int().min(0).max(10_000);

export const PoolParams = z.object({
  monthly_contribution: U128,
  min_tenure_months: z.number().int(),
  base_limit: U128,
  limit_per_month: U128,
  max_limit: U128,
  late_limit_bps: BasisPoints,
  max_exposure_bps: BasisPoints,
  max_active_per_member: z.number().int(),
  cooldown: U64,
  guarantee_ttl: U64,
  dispute_window: U64,
  pool_covered_bps: BasisPoints,
  cover_on_death: z.boolean(),
  council_tier_multiplier: z.number().int(),
  exit_lock_months: z.number().int(),
  exit_notice: U64,
  time_scale: z.number().int().positive(),
});

export const Hospital = z.object({ account: AccountId, name: z.string(), fc_public_key: z.string() });

export const Pool = z.object({
  id: z.number().int(),
  name: z.string(),
  dao: AccountId,
  token: AccountId,
  params: PoolParams,
  council: z.array(AccountId),
  hospitals: z.array(Hospital),
  balance: U128,
  reserved: U128,
  written_off: U128,
  created_at: U64,
});

export const Standing = z.enum(["Good", "Late", "Default"]);

export const Member = z.object({
  account: AccountId,
  pool_id: z.number().int(),
  joined_at: U64,
  contributed: U128,
  outstanding: U128,
  standing: Standing,
  active_guarantees: z.number().int(),
  last_guarantee_at: U64.nullable(),
  delegates: z.array(AccountId),
  exit_requested_at: U64.nullable(),
});

export const GStatus = z.enum([
  "PendingCouncil", "Issued", "Accepted", "Claimed", "Disputed",
  "Settled", "Released", "Expired", "Rejected", "WrittenOff",
]);

export const LocalAmount = z.object({ currency: z.string().length(3), amount: U128, fx_rate_e6: U64 });

export const AiReview = z.object({
  verdict: z.string(),
  flagged_lines: z.number().int(),
  report_hash: CryptoHash,
  signing_address: z.string(),
});

export const Claim = z.object({
  amount: U128,
  file_hash: CryptoHash,
  claimed_at: U64,
  dispute: z.string().nullable(),
  adjustment: U128,
  adjustment_reason: z.string().nullable(),
  paid: U128,
  ai_review: AiReview.nullable(),
});

export const Guarantee = z.object({
  id: z.number().int(),
  pool_id: z.number().int(),
  member: AccountId,
  requested_by: AccountId,
  patient_initials: z.string().max(4).nullable(),
  code_hash: CryptoHash,
  hospital: AccountId,
  amount: U128,
  local: LocalAmount.nullable(),
  status: GStatus,
  issued_at: U64,
  expires_at: U64,
  accepted_at: U64.nullable(),
  claim: Claim.nullable(),
  approved_by: AccountId.nullable(),
  transferred_from: z.number().int().nullable(),
});

export const Tier = z.enum(["Instant", "Council", "Rejected"]);

export const PoolStats = z.object({
  pool_id: z.number().int(),
  balance: U128,
  reserved: U128,
  exposure_bps: BasisPoints,
  written_off: U128,
  members: z.number().int(),
  issued: z.number().int(),
  settled: z.number().int(),
  defaults: z.number().int(),
});

export const LimitView = z.object({
  limit: U128,
  council_tier_max: U128,
  standing: Standing,
  eligible: z.boolean(),
  blocked_by: z.string().nullable(),
});

export type PoolParams = z.infer<typeof PoolParams>;
export type Hospital = z.infer<typeof Hospital>;
export type Pool = z.infer<typeof Pool>;
export type Standing = z.infer<typeof Standing>;
export type Member = z.infer<typeof Member>;
export type GStatus = z.infer<typeof GStatus>;
export type LocalAmount = z.infer<typeof LocalAmount>;
export type AiReview = z.infer<typeof AiReview>;
export type Claim = z.infer<typeof Claim>;
export type Guarantee = z.infer<typeof Guarantee>;
export type Tier = z.infer<typeof Tier>;
export type PoolStats = z.infer<typeof PoolStats>;
export type LimitView = z.infer<typeof LimitView>;
