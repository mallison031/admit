import assert from "node:assert/strict";
import test from "node:test";
import { Account, KeyPairEd25519 } from "near-api-js";
import { app } from "../src/index.js";
import { evaluateBill, hexToBytes } from "../src/routes/ai.js";

const testKey = KeyPairEd25519.fromRandom().toString();

// Test env setup
process.env.NEAR_NETWORK = "testnet";
process.env.NEAR_RPC_URL = "https://rpc.testnet.near.org";
process.env.ADMIT_CONTRACT = "pool.admit.testnet";
process.env.RELAYER_ACCOUNT = "relay.admit.testnet";
process.env.RELAYER_PRIVATE_KEY = testKey;
process.env.AI_REVIEWER_ACCOUNT = "ai.admit.testnet";
process.env.AI_REVIEWER_PRIVATE_KEY = testKey;

test("evaluateBill: clean bill matches reference rates", () => {
  const cleanBill = {
    hospital: "St. Mark's Hospital",
    lines: [
      { item: "Emergency Admission & Triage", amount: 50, currency: "USDC" },
      { item: "Rapid Blood Panel & Labs", amount: 60, currency: "USDC" },
    ],
    total: 110,
  };

  const res = evaluateBill(cleanBill);
  assert.equal(res.flaggedCount, 0);
  assert.equal(res.suggestedTrim, 0);
  assert.match(res.verdict, /MATCH/);
});

test("evaluateBill: detects inflated line items and redundant charges", () => {
  const inflatedBill = {
    hospital: "St. Mark's Hospital",
    lines: [
      { item: "Emergency Admission & Triage", amount: 50, currency: "USDC" },
      { item: "Rapid Blood Panel & Labs", amount: 60, currency: "USDC" },
      { item: "Ultrasound / Diagnostic Imaging", amount: 70, currency: "USDC" },
      { item: "Intravenous Antibiotics & Fluids", amount: 70, currency: "USDC" },
      { item: "Overnight Observation Bed", amount: 30, currency: "USDC" },
    ],
    total: 280,
  };

  const res = evaluateBill(inflatedBill);
  assert.equal(res.flaggedCount, 1);
  assert.equal(res.suggestedTrim, 30);
  assert.equal(res.flaggedItems[0]?.item, "Overnight Observation Bed");
  assert.equal(res.flaggedItems[0]?.variance, 30);
  assert.match(res.verdict, /FLAGGED/);
});

test("hexToBytes converts 64-char hex string to 32 bytes array", () => {
  const bytes = hexToBytes("000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f");
  assert.equal(bytes.length, 32);
  assert.equal(bytes[0], 0);
  assert.equal(bytes[1], 1);
  assert.equal(bytes[31], 31);
});

test("POST /ai/review rejects invalid request body", async () => {
  const res = await app.request("/ai/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ guarantee_id: -1 }),
  });

  assert.equal(res.status, 400);
  const data = (await res.json()) as { error: string };
  assert.ok(data.error);
});

test("POST /ai/review evaluates bill and returns structured advisory AiReview", async () => {
  const payload = {
    guarantee_id: 42,
    bill: {
      hospital: "St. Mark's Hospital",
      patient_initials: "AO",
      lines: [
        { item: "Emergency Admission & Triage", amount: 50, currency: "USDC" },
        { item: "Rapid Blood Panel & Labs", amount: 60, currency: "USDC" },
        { item: "Ultrasound / Diagnostic Imaging", amount: 70, currency: "USDC" },
        { item: "Intravenous Antibiotics & Fluids", amount: 70, currency: "USDC" },
        { item: "Overnight Observation Bed", amount: 30, currency: "USDC" },
      ],
      total: 280,
    },
    post_on_chain: false,
  };

  const res = await app.request("/ai/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200);
  const data = (await res.json()) as {
    ok: boolean;
    guarantee_id: number;
    review: {
      verdict: string;
      flagged_lines: number;
      report_hash: number[];
      signing_address: string;
    };
    details: {
      suggested_trim: number;
      flagged_items: unknown[];
    };
  };

  assert.equal(data.ok, true);
  assert.equal(data.guarantee_id, 42);
  assert.equal(data.review.flagged_lines, 1);
  assert.equal(data.details.suggested_trim, 30);
  assert.equal(data.review.report_hash.length, 32);
  assert.ok(data.review.signing_address.startsWith("0x"));
});

test("POST /ai/review with post_on_chain calls contract signAndSendTransaction", async () => {
  const origSignAndSend = Account.prototype.signAndSendTransaction;
  let sentAction: unknown;

  try {
    Account.prototype.signAndSendTransaction = (async (params: unknown) => {
      sentAction = params;
      return { transaction: { hash: "test-ai-review-tx-hash-777" } };
    }) as unknown as typeof Account.prototype.signAndSendTransaction;

    const payload = {
      guarantee_id: 10,
      bill: {
        hospital: "St. Mark's Hospital",
        lines: [{ item: "Emergency Admission & Triage", amount: 50, currency: "USDC" }],
        total: 50,
      },
      post_on_chain: true,
    };

    const res = await app.request("/ai/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 200);
    const data = (await res.json()) as { ok: boolean; txHash: string };
    assert.equal(data.ok, true);
    assert.equal(data.txHash, "test-ai-review-tx-hash-777");
    assert.ok(sentAction);
  } finally {
    Account.prototype.signAndSendTransaction = origSignAndSend;
  }
});
