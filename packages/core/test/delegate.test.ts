import test from "node:test";
import assert from "node:assert/strict";
import { deserialize } from "borsh";
import { base64Decode, KeyPairEd25519, SCHEMA } from "near-api-js";
import { signDelegate } from "../src/delegate.js";
import { calls } from "../src/contract.js";

test("signDelegate_builds_and_signs_valid_payload", async () => {
  const kp = KeyPairEd25519.fromRandom();
  const privKey = kp.toString();

  const codeHash = new Array(32).fill(7);
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
    privateKey: privKey,
    nonce: 42n,
    maxBlockHeight: 1000n,
  });

  assert.ok(payload.signedDelegate);
  assert.equal(typeof payload.signedDelegate, "string");

  // Verify that it decodes cleanly into a Borsh SignedDelegate
  const bytes = base64Decode(payload.signedDelegate);
  assert.ok(bytes.length > 0);

  interface DecodedSignedDelegate {
    delegateAction: {
      senderId: string;
      receiverId: string;
      nonce: bigint;
      maxBlockHeight: bigint;
      actions: { functionCall: { methodName: string } }[];
    };
  }
  const decoded = deserialize(
    SCHEMA.SignedDelegate,
    bytes,
  ) as unknown as DecodedSignedDelegate;
  assert.equal(decoded.delegateAction.senderId, "alice.testnet");
  assert.equal(decoded.delegateAction.receiverId, "admit.testnet");
  assert.equal(decoded.delegateAction.nonce, 42n);
  assert.equal(decoded.delegateAction.maxBlockHeight, 1000n);
  assert.equal(decoded.delegateAction.actions.length, 1);
  assert.equal(
    decoded.delegateAction.actions[0]?.functionCall.methodName,
    "request_guarantee",
  );
});
