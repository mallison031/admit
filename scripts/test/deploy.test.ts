import test from "node:test";
import assert from "node:assert/strict";
import { deployTestnet } from "../deploy-testnet.js";

test("deploy_testnet_dry_run_returns_clean_result", async () => {
  const result = await deployTestnet({
    dryRun: true,
    envOverride: {
      NEAR_NETWORK: "testnet",
      NEAR_RPC_URL: "https://rpc.testnet.near.org",
      ADMIT_CONTRACT: "pool.admit-hack-6711fd.testnet",
      TOKEN_CONTRACT: "tusdc.admit-hack-6711fd.testnet",
      DEPLOYER_ACCOUNT: "admit-hack-6711fd.testnet",
      DEPLOYER_PRIVATE_KEY: "ed25519:dummy",
    },
  });

  assert.equal(result.tokenContract, "tusdc.admit-hack-6711fd.testnet");
  assert.equal(result.admitContract, "pool.admit-hack-6711fd.testnet");
  assert.match(result.tokenExplorer, /testnet\.nearblocks\.io\/address/);
  assert.match(result.admitExplorer, /testnet\.nearblocks\.io\/address/);
  assert.equal(result.tokenNewlyDeployed, false);
  assert.equal(result.admitNewlyDeployed, false);
});
