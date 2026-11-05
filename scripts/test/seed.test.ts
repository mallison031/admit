import test from "node:test";
import assert from "node:assert/strict";
import { seedPool } from "../seed.js";

test("seed_pool_dry_run_returns_seeded_pool_structure", async () => {
  const result = await seedPool({
    dryRun: true,
    envOverride: {
      NEAR_NETWORK: "testnet",
      NEAR_RPC_URL: "https://rpc.testnet.near.org",
      ADMIT_CONTRACT: "pool.admit-hack-6711fd.testnet",
      TOKEN_CONTRACT: "tusdc.admit-hack-6711fd.testnet",
      DEPLOYER_ACCOUNT: "admit-hack-6711fd.testnet",
      DEPLOYER_PRIVATE_KEY: "ed25519:dummy",
      COUNCIL_ACCOUNTS: "council1.testnet,council2.testnet",
      HOSPITAL_ACCOUNTS: "hospital1.testnet,hospital2.testnet",
    },
  });

  assert.equal(result.poolId, 0);
  assert.equal(result.poolName, "St. Mark's Emergency Circle");
  assert.equal(result.dao, "admit-hack-6711fd.testnet");
  assert.equal(result.membersCount, 20);
  assert.deepEqual(result.council, ["council1.testnet", "council2.testnet"]);
  assert.match(result.explorerUrl, /testnet\.nearblocks\.io\/address/);
});
