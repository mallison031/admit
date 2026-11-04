import test from "node:test";
import assert from "node:assert/strict";
import { step, link } from "../lib/log.js";

test("step_prints_numbered_title", () => {
  const result = step(1, "Deploying admit-pool contract");
  assert.match(result, /^\[1\] Deploying admit-pool contract \(\d{4}-\d{2}-\d{2}T/);

  const txUrl = link("tx", "9ZNhLrqs1q1f2vY");
  assert.equal(txUrl, "https://testnet.nearblocks.io/txns/9ZNhLrqs1q1f2vY");

  const accUrl = link("account", "hospital.testnet");
  assert.equal(accUrl, "https://testnet.nearblocks.io/address/hospital.testnet");
});
