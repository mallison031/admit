// Mirror of contracts/admit-pool/src/limits.rs and time.rs (A-7.2). PURE. Change both together.
import type { Member, Pool, PoolParams, Standing, Tier } from "./types.js";

export const NS_PER_SECOND = 1_000_000_000n;
export const NS_PER_DAY = 86_400n * NS_PER_SECOND;
export const NS_PER_MONTH = 30n * NS_PER_DAY;

export const scaled = (durationNs: bigint, timeScale: number): bigint => {
  const scale = BigInt(Math.max(1, timeScale));
  return durationNs / scale;
};

export const monthsBetween = (fromNs: bigint, toNs: bigint, timeScale: number): bigint => {
  if (toNs <= fromNs) {
    return 0n;
  }
  const diff = toNs - fromNs;
  const scale = BigInt(Math.max(1, timeScale));
  const product = diff * scale;
  return product / NS_PER_MONTH;
};

export const tenureMonths = (m: Member, p: PoolParams, nowNs: bigint): bigint => {
  return monthsBetween(BigInt(m.joined_at), nowNs, p.time_scale);
};

export const goodMonths = (m: Member, p: PoolParams, nowNs: bigint): bigint => {
  const tenure = tenureMonths(m, p, nowNs);
  const monthly = BigInt(p.monthly_contribution);
  const paidMonths = monthly === 0n ? 0n : BigInt(m.contributed) / monthly;
  return tenure < paidMonths ? tenure : paidMonths;
};

export const rawLimit = (p: PoolParams, gMonths: bigint): bigint => {
  const growth = BigInt(p.limit_per_month) * gMonths;
  const total = BigInt(p.base_limit) + growth;
  const max = BigInt(p.max_limit);
  return total < max ? total : max;
};

export const limit = (m: Member, p: PoolParams, reservedForMember: bigint, nowNs: bigint): bigint => {
  if (m.standing === "Default") {
    return 0n;
  }
  const tenure = tenureMonths(m, p, nowNs);
  if (tenure < BigInt(p.min_tenure_months)) {
    return 0n;
  }
  const good = goodMonths(m, p, nowNs);
  const raw = rawLimit(p, good);
  const outstanding = BigInt(m.outstanding);
  let available = raw > outstanding ? raw - outstanding : 0n;
  available = available > reservedForMember ? available - reservedForMember : 0n;

  if (m.standing === "Good") {
    return available;
  }
  if (m.standing === "Late") {
    return (available * BigInt(p.late_limit_bps)) / 10_000n;
  }
  return 0n;
};

export const exposureOk = (pool: Pool, amount: bigint): boolean => {
  const newReserved = BigInt(pool.reserved) + amount;
  const cap = (BigInt(pool.balance) * BigInt(pool.params.max_exposure_bps)) / 10_000n;
  return newReserved <= cap;
};

export const tier = (amount: bigint, memberLimit: bigint, p: PoolParams): Tier => {
  if (amount <= memberLimit) {
    return "Instant";
  }
  const councilMax = memberLimit * BigInt(p.council_tier_multiplier);
  if (amount <= councilMax) {
    return "Council";
  }
  return "Rejected";
};

export const deriveStanding = (m: Member, p: PoolParams, nowNs: bigint): Standing => {
  if (m.standing === "Default") {
    return "Default";
  }
  const tenure = tenureMonths(m, p, nowNs);
  const monthly = BigInt(p.monthly_contribution);
  const paidMonths = monthly === 0n ? 0n : BigInt(m.contributed) / monthly;
  if (tenure > paidMonths) {
    return "Late";
  }
  return "Good";
};
