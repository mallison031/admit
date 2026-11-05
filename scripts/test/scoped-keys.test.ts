import test from "node:test";
import assert from "node:assert/strict";
import { JsonRpcProvider } from "near-api-js";
import {
  createScopedKeyPair,
  HOSPITAL_METHODS,
  DELEGATE_METHODS,
  RELAYED_METHODS,
  type RelayedMethod,
  verifyScopedKey,
} from "../lib/scoped-keys.js";

test("hospital and delegate methods partition relayer allowlist exactly", () => {
  const allScoped: readonly string[] = [...HOSPITAL_METHODS, ...DELEGATE_METHODS];
  assert.equal(allScoped.length, RELAYED_METHODS.length);
  for (const m of RELAYED_METHODS) {
    assert.ok(
      allScoped.includes(m as RelayedMethod),
      `Expected ${m} to be covered by scoped key methods`,
    );
  }
});

test("createScopedKeyPair produces valid ed25519 keypair", () => {
  const kp = createScopedKeyPair();
  assert.match(kp.publicKey, /^ed25519:[1-9A-HJ-NP-Za-km-z]+$/);
  assert.match(kp.privateKey, /^ed25519:[1-9A-HJ-NP-Za-km-z]+$/);
});

test("verifyScopedKey identifies function call permission correctly", async () => {
  const fakeProvider = {
    async query() {
      return {
        keys: [
          {
            public_key: "ed25519:testkey123",
            access_key: {
              permission: {
                FunctionCall: {
                  receiver_id: "pool.admit.testnet",
                  method_names: ["hospital_accept", "hospital_claim"],
                  allowance: "250000000000000000000000",
                },
              },
            },
          },
        ],
      };
    },
  } as unknown as JsonRpcProvider;

  const res = await verifyScopedKey({
    accountId: "hospital1.testnet",
    publicKey: "ed25519:testkey123",
    provider: fakeProvider,
  });

  assert.equal(res.isValid, true);
  assert.equal(res.receiverId, "pool.admit.testnet");
  assert.deepEqual(res.methodNames, ["hospital_accept", "hospital_claim"]);
});

