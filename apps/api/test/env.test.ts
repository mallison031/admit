import test from "node:test";
import assert from "node:assert/strict";
import { loadEnv } from "../src/env.js";

test("loadEnv_succeeds_with_valid_config", () => {
  const valid = {
    NEAR_NETWORK: "testnet",
    NEAR_RPC_URL: "https://rpc.testnet.near.org",
    ADMIT_CONTRACT: "admit.testnet",
    RELAYER_ACCOUNT: "relay.testnet",
    RELAYER_PRIVATE_KEY: "ed25519:5oLgFcAkBMje",
    API_PORT: "8787",
  };

  const parsed = loadEnv(valid);
  assert.equal(parsed.NEAR_NETWORK, "testnet");
  assert.equal(parsed.ADMIT_CONTRACT, "admit.testnet");
  assert.equal(parsed.API_PORT, 8787);
  assert.equal(parsed.RELAY_RATE_LIMIT_PER_MIN, 20);
});

test("loadEnv_fails_fast_on_missing_required_var", () => {
  const missing = {
    NEAR_NETWORK: "testnet",
    // Missing NEAR_RPC_URL and keys
  };

  assert.throws(
    () => loadEnv(missing as unknown as Record<string, string>),
    /NEAR_RPC_URL|ADMIT_CONTRACT/,
  );
});
