import test from "node:test";
import assert from "node:assert/strict";
import { KeyPairEd25519 } from "near-api-js";
import { signDelegate, calls } from "@admit/core";
import { RELAYED_METHODS, isRelayedMethod } from "../src/relayer/allowlist.js";
import { verifyDelegate } from "../src/relayer/verify.js";

test("allowlist_contains_exact_architecture_methods", () => {
  const expectedMethods = [
    "request_guarantee",
    "request_topup",
    "hospital_accept",
    "hospital_claim",
    "hospital_release",
    "hospital_transfer",
    "member_dispute",
  ];

  assert.deepEqual(Array.from(RELAYED_METHODS), expectedMethods);

  for (const method of expectedMethods) {
    assert.equal(isRelayedMethod(method), true);
  }

  // Not in allowlist
  assert.equal(isRelayedMethod("settle"), false);
  assert.equal(isRelayedMethod("council_set_params"), false);
  assert.equal(isRelayedMethod("join"), false);
  assert.equal(isRelayedMethod("create_pool"), false);
});

test("verifyDelegate_accepts_valid_payload", async () => {
  const kp = KeyPairEd25519.fromRandom();
  const codeHash = new Array(32).fill(1);
  const call = calls.requestGuarantee({
    pool_id: 0,
    member: "alice.testnet",
    hospital: "general-hospital.testnet",
    amount: "100000000",
    code_hash: codeHash,
  });

  const payload = await signDelegate({
    senderId: "alice.testnet",
    receiverId: "admit.testnet",
    call,
    privateKey: kp.toString(),
    nonce: 1n,
    maxBlockHeight: 100n,
  });

  const result = verifyDelegate(payload.signedDelegate, "admit.testnet");
  assert.equal(result.ok, true);
  assert.equal(result.senderId, "alice.testnet");
});

test("verifyDelegate_rejects_wrong_receiver", async () => {
  const kp = KeyPairEd25519.fromRandom();
  const call = calls.hospitalAccept(1);

  const payload = await signDelegate({
    senderId: "hospital.testnet",
    receiverId: "wrong-contract.testnet",
    call,
    privateKey: kp.toString(),
    nonce: 1n,
    maxBlockHeight: 100n,
  });

  const result = verifyDelegate(payload.signedDelegate, "admit.testnet");
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /invalid receiver/i);
});

test("verifyDelegate_rejects_disallowed_method", async () => {
  const kp = KeyPairEd25519.fromRandom();
  // settle is not in the relayer allowlist
  const call = calls.settle({ guarantee_id: 1 });

  const payload = await signDelegate({
    senderId: "council.testnet",
    receiverId: "admit.testnet",
    call,
    privateKey: kp.toString(),
    nonce: 1n,
    maxBlockHeight: 100n,
  });

  const result = verifyDelegate(payload.signedDelegate, "admit.testnet");
  assert.equal(result.ok, false);
  assert.match(result.reason ?? "", /method not allowed/i);
});
