import test from "node:test";
import assert from "node:assert/strict";
import {
  type DemoContext,
} from "../demo/types.js";
import {
  type PoolParams,
  type PoolStats,
  type Standing,
  type GStatus,
} from "@admit/core";
import { CALIBRATED_POOL_PARAMS } from "../seed.js";
import { step1 } from "../demo/step1.js";
import { step2 } from "../demo/step2.js";
import { step3 } from "../demo/step3.js";
import { step4 } from "../demo/step4.js";
import { step5 } from "../demo/step5.js";
import { step6 } from "../demo/step6.js";
import { step7 } from "../demo/step7.js";
import { runDemo } from "../demo.js";

const createMockContext = (): DemoContext => {
  return {
    cfg: {
      NEAR_NETWORK: "testnet",
      NEAR_RPC_URL: "https://rpc.testnet.near.org",
      ADMIT_CONTRACT: "pool.admit.testnet",
      TOKEN_CONTRACT: "tusdc.admit.testnet",
      DEPLOYER_ACCOUNT: "admit.testnet",
      DEPLOYER_PRIVATE_KEY: "ed25519:mock",
      COUNCIL_ACCOUNTS: ["council1.testnet"],
      HOSPITAL_ACCOUNTS: ["hospital1.testnet", "hospital2.testnet"],
      MEMBER_ACCOUNTS: ["member1.testnet"],
      COUNCIL_DAO: "admit.testnet",
      RELAYER_ACCOUNT: "relay.testnet",
      RELAYER_PRIVATE_KEY: "ed25519:mock",
    },
    poolId: 0,
    provider: {} as unknown as DemoContext["provider"],
    viewClient: {
      async getPool() {
        return {
          id: 0,
          name: "St. Mark's Emergency Circle",
          dao: "admit.testnet",
          token: "tusdc.admit.testnet",
          params: CALIBRATED_POOL_PARAMS as PoolParams,
          council: ["council1.testnet"],
          hospitals: [
            {
              account: "hospital1.testnet",
              name: "St. Nicholas Clinic",
              fc_public_key: "ed25519:mock",
            },
            {
              account: "hospital2.testnet",
              name: "Lagos Island General Hospital",
              fc_public_key: "ed25519:mock",
            },
          ],
          balance: "1000000000",
          reserved: "0",
          written_off: "0",
          created_at: "100",
        };
      },
      async getMember() {
        return {
          account: "member1.testnet",
          pool_id: 0,
          joined_at: "100",
          contributed: "100000000",
          outstanding: "0",
          standing: "Good" as Standing,
          active_guarantees: 0,
          last_guarantee_at: null,
          delegates: ["relay.testnet"],
          exit_requested_at: null,
        };
      },
      async getLimit() {
        return {
          limit: "300000000",
          council_tier_max: "900000000",
          standing: "Good" as Standing,
          eligible: true,
          blocked_by: null,
        };
      },
      async getGuarantee(id: number) {
        return {
          id,
          pool_id: 0,
          member: "member1.testnet",
          requested_by: "relay.testnet",
          patient_initials: "M.D.",
          code_hash: [1, 2, 3],
          hospital: "hospital1.testnet",
          amount: "300000000",
          local: null,
          status: "Issued" as GStatus,
          issued_at: "100",
          expires_at: "2000000000",
          accepted_at: null,
          claim: null,
          approved_by: null,
          transferred_from: null,
        };
      },
      async listGuarantees() {
        return [];
      },
      async getPoolStats(): Promise<PoolStats> {
        return {
          pool_id: 0,
          balance: "1000000000",
          reserved: "0",
          exposure_bps: 8000,
          written_off: "0",
          members: 1,
          issued: 0,
          settled: 0,
          defaults: 0,
        };
      },
    },
    memberAccount: "member1.testnet",
    hospitalAccount: "hospital1.testnet",
    hospitalName: "St. Nicholas Clinic",
    councilAccount: "council1.testnet",
    simulated: true,
  };
};

test("demo step1 validates pool state cleanly", async () => {
  const ctx = createMockContext();
  await step1(ctx);
  assert.equal(ctx.hospitalName, "St. Nicholas Clinic");
});

test("demo step2 generates code and issues guarantee", async () => {
  const ctx = createMockContext();
  await step2(ctx);
  assert.ok(ctx.guaranteeCode);
  assert.equal(ctx.guaranteeCode.length, 6);
  assert.equal(ctx.guaranteeId, 0);
});

test("demo step3 verifies intake code and stops expiry", async () => {
  const ctx = createMockContext();
  ctx.guaranteeId = 0;
  ctx.guaranteeCode = "K7Q2MX";
  ctx.viewClient.getGuarantee = async () => ({
    id: 0,
    pool_id: 0,
    member: "member1.testnet",
    requested_by: "relay.testnet",
    patient_initials: "M.D.",
    code_hash: Array.from(await import("@admit/core").then((m) => m.codeHash("K7Q2MX", 0))),
    hospital: "hospital1.testnet",
    amount: "300000000",
    local: null,
    status: "Issued" as GStatus,
    issued_at: "100",
    expires_at: "2000000000",
    accepted_at: null,
    claim: null,
    approved_by: null,
    transferred_from: null,
  });
  await step3(ctx);
});

test("demo step4 processes claim, dispute and settlement", async () => {
  const ctx = createMockContext();
  ctx.guaranteeId = 0;
  await step4(ctx);
});

test("demo step5 tracks debt and limit recovery", async () => {
  const ctx = createMockContext();
  await step5(ctx);
});

test("demo step6 asserts all abuse vectors are denied", async () => {
  const ctx = createMockContext();
  await step6(ctx);
});

test("demo step7 reports solvency simulation summary", async () => {
  const ctx = createMockContext();
  await step7(ctx);
});

test("runDemo runs full 7-step sequence in simulated mode", async () => {
  await runDemo({ simulated: true });
});
