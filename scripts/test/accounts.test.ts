import test from "node:test";
import assert from "node:assert/strict";
import { loadAccounts } from "../lib/accounts.js";

test("load_accounts_rejects_missing_vars", async () => {
  // Missing required vars
  await assert.rejects(
    async () => {
      await loadAccounts({});
    },
    (err: Error) => {
      assert.match(err.message, /ADMIT_CONTRACT|DEPLOYER_ACCOUNT|TOKEN_CONTRACT/);
      return true;
    },
  );

  // Valid env override
  const config = await loadAccounts({
    ADMIT_CONTRACT: "admit.testnet",
    TOKEN_CONTRACT: "tusdc.testnet",
    DEPLOYER_ACCOUNT: "deployer.testnet",
    DEPLOYER_PRIVATE_KEY: "ed25519:testkey123",
    COUNCIL_ACCOUNTS: "c1.testnet, c2.testnet",
  });

  assert.equal(config.ADMIT_CONTRACT, "admit.testnet");
  assert.equal(config.TOKEN_CONTRACT, "tusdc.testnet");
  assert.equal(config.DEPLOYER_ACCOUNT, "deployer.testnet");
  assert.deepEqual(config.COUNCIL_ACCOUNTS, ["c1.testnet", "c2.testnet"]);
  assert.equal(config.NEAR_NETWORK, "testnet");
});
