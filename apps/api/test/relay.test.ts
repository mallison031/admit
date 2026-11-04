import test from "node:test";
import assert from "node:assert/strict";
import { Account, KeyPairEd25519 } from "near-api-js";
import { signDelegate, calls } from "@admit/core";
import { app } from "../src/index.js";

const relayerKeypair = KeyPairEd25519.fromRandom();

// Set test environment variables
process.env.NEAR_NETWORK = "testnet";
process.env.NEAR_RPC_URL = "https://rpc.testnet.near.org";
process.env.ADMIT_CONTRACT = "admit.testnet";
process.env.RELAYER_ACCOUNT = "relay.testnet";
process.env.RELAYER_PRIVATE_KEY = relayerKeypair.toString();
process.env.API_PORT = "8787";
process.env.ONECLICK_API_KEY = "test-oneclick-api-secret-key-987654";

test("relay_route_submits_valid_delegate_action", async () => {
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

  const origSignAndSend = Account.prototype.signAndSendTransaction;
  try {
    (
      Account.prototype as unknown as {
        signAndSendTransaction: () => Promise<{ transaction: { hash: string } }>;
      }
    ).signAndSendTransaction = async () => ({
      transaction: { hash: "9V1testTxHashValid123" },
    });

    const res = await app.request("/relay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signedDelegate: payload.signedDelegate }),
    });

    const body = (await res.json()) as { ok?: boolean; txHash?: string };
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.txHash, "9V1testTxHashValid123");
  } finally {
    Account.prototype.signAndSendTransaction = origSignAndSend;
  }
});

test("relay_route_rejects_disallowed_method", async () => {
  const kp = KeyPairEd25519.fromRandom();
  // settle is not permitted for relayer
  const call = calls.settle({ guarantee_id: 1 });

  const payload = await signDelegate({
    senderId: "council.testnet",
    receiverId: "admit.testnet",
    call,
    privateKey: kp.toString(),
    nonce: 1n,
    maxBlockHeight: 100n,
  });

  const res = await app.request("/relay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedDelegate: payload.signedDelegate }),
  });

  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string };
  assert.match(body.error, /method not allowed/i);
});

test("onboard_route_returns_pairing_instructions_without_secrets", async () => {
  const res = await app.request("/onboard/device", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      devicePublicKey: "ed25519:testDevicePublicKey123",
      memberAccount: "alice.testnet",
    }),
  });

  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    ok: boolean;
    devicePublicKey: string;
    memberAccount: string;
    instructions: string;
    method: string;
  };
  assert.equal(body.ok, true);
  assert.equal(body.devicePublicKey, "ed25519:testDevicePublicKey123");
  assert.equal(body.memberAccount, "alice.testnet");
  assert.equal(body.method, "add_delegate");
  assert.ok(body.instructions);
});

test("quote_route_proxies_dry_run_request", async () => {
  const origFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      assert.match(String(url), /1click\.chaindefuser\.com/);
      const parsedBody = JSON.parse(init?.body as string);
      assert.equal(parsedBody.dry, true);
      assert.equal(parsedBody.amountIn, "1000000");
      return new Response(
        JSON.stringify({ quoteId: "quote-123", amountOut: "999000" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    };

    const res = await app.request("/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        defuseAssetIdIn: "near:wrap.near",
        defuseAssetIdOut: "near:usdc.near",
        amountIn: "1000000",
      }),
    });

    assert.equal(res.status, 200);
    const body = (await res.json()) as { quoteId: string; amountOut: string };
    assert.equal(body.quoteId, "quote-123");
  } finally {
    globalThis.fetch = origFetch;
  }
});

test("logs_never_contain_secrets", async () => {
  // Capture console logs and console errors
  const capturedLogs: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
    origLog(...args);
  };
  console.error = (...args: unknown[]) => {
    capturedLogs.push(args.map(String).join(" "));
    origError(...args);
  };

  try {
    // Run multiple route requests
    await app.request("/health");
    await app.request("/onboard/device", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        devicePublicKey: "ed25519:sampleDevKey",
        memberAccount: "alice.testnet",
      }),
    });

    const relayerSecret = process.env.RELAYER_PRIVATE_KEY!;
    const oneclickSecret = process.env.ONECLICK_API_KEY!;

    for (const logLine of capturedLogs) {
      assert.equal(
        logLine.includes(relayerSecret),
        false,
        "Log line must not contain relayer private key",
      );
      assert.equal(
        logLine.includes(oneclickSecret),
        false,
        "Log line must not contain oneclick API key",
      );
    }
  } finally {
    console.log = origLog;
    console.error = origError;
  }
});
