import test from "node:test";
import assert from "node:assert/strict";
import {
  NS_PER_MONTH,
  tenureMonths,
  goodMonths,
  rawLimit,
  limit,
  exposureOk,
  tier,
  deriveStanding,
} from "../src/limits.js";
import type { Member, Pool, PoolParams } from "../src/types.js";

const sampleParams: PoolParams = {
  monthly_contribution: "10000000",
  min_tenure_months: 1,
  base_limit: "50000000",
  limit_per_month: "25000000",
  max_limit: "500000000",
  late_limit_bps: 5000,
  max_exposure_bps: 8000,
  max_active_per_member: 2,
  cooldown: "2592000000000000",
  guarantee_ttl: "604800000000000",
  dispute_window: "1209600000000000",
  pool_covered_bps: 7000,
  cover_on_death: true,
  council_tier_multiplier: 3,
  exit_lock_months: 3,
  exit_notice: "2592000000000000",
  time_scale: 1,
};

const sampleMember: Member = {
  account: "alice.testnet",
  pool_id: 0,
  joined_at: "1000",
  contributed: "30000000",
  outstanding: "0",
  standing: "Good",
  active_guarantees: 0,
  last_guarantee_at: null,
  delegates: [],
  exit_requested_at: null,
};

const samplePool: Pool = {
  id: 0,
  name: "Admit Health Pool",
  dao: "admit-dao.sputnik-dao.near",
  token: "usdc.testnet",
  params: sampleParams,
  council: ["alice.testnet"],
  hospitals: [],
  balance: "10000",
  reserved: "2000",
  written_off: "0",
  created_at: "0",
};

test("tenureMonths_matches_rust_cases", () => {
  const p = { ...sampleParams };
  const m = { ...sampleMember, joined_at: "1000" };
  const now = 1000n + 3n * NS_PER_MONTH;
  assert.equal(tenureMonths(m, p, now), 3n);
});

test("goodMonths_matches_rust_cases", () => {
  const p: PoolParams = { ...sampleParams, monthly_contribution: "10" };
  const m: Member = { ...sampleMember, joined_at: "0", contributed: "30" };
  const now = 6n * NS_PER_MONTH;
  // Tenure is 6 months, but only contributed 30 (3 months)
  assert.equal(goodMonths(m, p, now), 3n);

  // Contributed 100 (10 months), but tenure is only 2 months
  const m2: Member = { ...sampleMember, joined_at: "0", contributed: "100" };
  const now2 = 2n * NS_PER_MONTH;
  assert.equal(goodMonths(m2, p, now2), 2n);
});

test("rawLimit_matches_rust_cases", () => {
  const p: PoolParams = {
    ...sampleParams,
    base_limit: "50",
    limit_per_month: "25",
    max_limit: "500",
  };
  assert.equal(rawLimit(p, 0n), 50n);
  assert.equal(rawLimit(p, 2n), 100n);
  assert.equal(rawLimit(p, 4n), 150n);

  // Caps at max
  const pCapped: PoolParams = { ...p, max_limit: "100" };
  assert.equal(rawLimit(pCapped, 10n), 100n);
});

test("limit_matches_rust_cases", () => {
  const p: PoolParams = {
    ...sampleParams,
    min_tenure_months: 2,
    base_limit: "100",
    limit_per_month: "0",
    max_limit: "500",
    late_limit_bps: 5000,
  };
  const m: Member = {
    ...sampleMember,
    joined_at: "0",
    contributed: "100000000",
    outstanding: "0",
    standing: "Good",
  };

  // Limit is zero below min tenure (tenure 1 month < min 2 months)
  const now1 = NS_PER_MONTH;
  assert.equal(limit(m, p, 0n, now1), 0n);

  // Late member gets reduced limit
  const pLate: PoolParams = { ...p, min_tenure_months: 1 };
  const mLate: Member = { ...m, standing: "Late", contributed: "100" };
  const now2 = 2n * NS_PER_MONTH;
  // Raw limit is 100. Late gets 100 * 50% = 50.
  assert.equal(limit(mLate, pLate, 0n, now2), 50n);

  // Limit subtracts debt and reserved
  const mDebt: Member = { ...m, outstanding: "30", contributed: "100" };
  assert.equal(limit(mDebt, pLate, 20n, now2), 50n);

  // Debt exceeds raw limit floors at 0
  const mExcessDebt: Member = { ...m, outstanding: "150", contributed: "100" };
  assert.equal(limit(mExcessDebt, pLate, 0n, now2), 0n);

  // Default standing is 0
  const mDefault: Member = { ...m, standing: "Default" };
  assert.equal(limit(mDefault, pLate, 0n, now2), 0n);
});

test("exposureOk_matches_rust_cases", () => {
  const pl: Pool = {
    ...samplePool,
    balance: "10000",
    reserved: "2000",
    params: { ...sampleParams, max_exposure_bps: 8000 },
  };

  // 2,000 + 5,000 = 7,000 <= 8,000
  assert.equal(exposureOk(pl, 5000n), true);
  // 2,000 + 6,000 = 8,000 <= 8,000
  assert.equal(exposureOk(pl, 6000n), true);
  // 2,000 + 6,001 = 8,001 > 8,000
  assert.equal(exposureOk(pl, 6001n), false);
});

test("tier_matches_rust_cases", () => {
  const p: PoolParams = { ...sampleParams, council_tier_multiplier: 3 };
  const memberLim = 100n;

  // Instant if <= limit
  assert.equal(tier(50n, memberLim, p), "Instant");
  assert.equal(tier(100n, memberLim, p), "Instant");

  // Council if <= limit * multiplier
  assert.equal(tier(101n, memberLim, p), "Council");
  assert.equal(tier(300n, memberLim, p), "Council");

  // Rejected if > council max
  assert.equal(tier(301n, memberLim, p), "Rejected");
});

test("deriveStanding_matches_rust_cases", () => {
  const p: PoolParams = { ...sampleParams, monthly_contribution: "10000000" };
  const m: Member = {
    ...sampleMember,
    joined_at: "0",
    contributed: "10000000",
    standing: "Good",
  };
  const now = 2n * NS_PER_MONTH;

  // Tenure 2 months, contributed 1 month -> Late
  assert.equal(deriveStanding(m, p, now), "Late");

  // Contributed 2 months -> Good
  const mPaid: Member = { ...m, contributed: "20000000" };
  assert.equal(deriveStanding(mPaid, p, now), "Good");

  // Default remains Default
  const mDefault: Member = { ...mPaid, standing: "Default" };
  assert.equal(deriveStanding(mDefault, p, now), "Default");
});
