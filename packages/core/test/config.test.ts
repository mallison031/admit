import test from "node:test";
import assert from "node:assert/strict";
import { explorerTxUrl, explorerAccountUrl } from "../src/config.js";

test("explorerTxUrl_cases", () => {
  assert.equal(
    explorerTxUrl("testnet", "9V1abc123"),
    "https://testnet.nearblocks.io/txns/9V1abc123",
  );
  assert.equal(
    explorerTxUrl("mainnet", "9V1abc123"),
    "https://nearblocks.io/txns/9V1abc123",
  );
});

test("explorerAccountUrl_cases", () => {
  assert.equal(
    explorerAccountUrl("testnet", "alice.testnet"),
    "https://testnet.nearblocks.io/address/alice.testnet",
  );
  assert.equal(
    explorerAccountUrl("mainnet", "alice.near"),
    "https://nearblocks.io/address/alice.near",
  );
});
