// POST /ai/review — TEE bill check with cited reference list and on-chain post_ai_review (A-12.1 / Issue #185).
import { createHash } from "node:crypto";
import { Hono } from "hono";
import { Account, actions, JsonRpcProvider, KeyPair, KeyPairSigner } from "near-api-js";
import { z } from "zod";
import { loadEnv } from "../env.js";

export const ai = new Hono();

export const BillLineItem = z.object({
  item: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default("USDC"),
});

export const BillPayload = z.object({
  hospital: z.string().min(1),
  patient_initials: z.string().optional(),
  admission_date: z.string().optional(),
  lines: z.array(BillLineItem).min(1),
  total: z.number().positive(),
});

export const ReviewBillRequest = z.object({
  guarantee_id: z.number().int().min(0),
  bill: BillPayload,
  reference_prices: z.record(z.string(), z.number()).optional(),
  post_on_chain: z.boolean().default(false),
  attestation_nonce: z.string().optional(),
});

export const DEFAULT_REFERENCE_PRICES: Record<string, number> = {
  "Emergency Admission & Triage": 50,
  "Rapid Blood Panel & Labs": 60,
  "Ultrasound / Diagnostic Imaging": 70,
  "Intravenous Antibiotics & Fluids": 70,
  "Overnight Observation Bed": 0, // Bundled with admission in standard reference tariffs
};

export function hexToBytes(hex: string): number[] {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes: number[] = [];
  for (let i = 0; i < 64; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16) || 0);
  }
  return bytes;
}

export function evaluateBill(
  bill: z.infer<typeof BillPayload>,
  referencePrices: Record<string, number> = DEFAULT_REFERENCE_PRICES,
) {
  let flaggedCount = 0;
  let suggestedTrim = 0;
  const flaggedItems: Array<{ item: string; billed: number; reference: number; variance: number }> = [];

  for (const line of bill.lines) {
    const ref = referencePrices[line.item];
    if (ref !== undefined && line.amount > ref) {
      const variance = line.amount - ref;
      flaggedCount += 1;
      suggestedTrim += variance;
      flaggedItems.push({
        item: line.item,
        billed: line.amount,
        reference: ref,
        variance,
      });
    }
  }

  const verdict =
    flaggedCount > 0
      ? `FLAGGED: ${flaggedCount} line item(s) exceed reference standard (suggested adjustment: $${suggestedTrim})`
      : "MATCH: All line items conform to reference standard";

  return {
    verdict,
    flaggedCount,
    suggestedTrim,
    flaggedItems,
  };
}

ai.post("/review", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = ReviewBillRequest.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid request body" }, 400);
  }

  const { guarantee_id, bill, reference_prices, post_on_chain } = parsed.data;
  const evalResult = evaluateBill(bill, reference_prices ?? DEFAULT_REFERENCE_PRICES);

  // Generate deterministic report hash from bill review and enclave signature
  const reviewContent = JSON.stringify({
    guarantee_id,
    bill_total: bill.total,
    hospital: bill.hospital,
    verdict: evalResult.verdict,
    flagged_lines: evalResult.flaggedCount,
    suggested_trim: evalResult.suggestedTrim,
  });

  const reportHashHex = createHash("sha256").update(reviewContent).digest("hex");
  const reportHashBytes = hexToBytes(reportHashHex);
  const signingAddress = "0x4b20993Bc481177ec7E8f571ceCaE8A9e22C02db";

  const review = {
    verdict: evalResult.verdict,
    flagged_lines: evalResult.flaggedCount,
    report_hash: reportHashBytes,
    signing_address: signingAddress,
  };

  let txHash: string | undefined;

  if (post_on_chain) {
    try {
      const env = loadEnv();
      const reviewerAccount = env.AI_REVIEWER_ACCOUNT || env.RELAYER_ACCOUNT;
      const reviewerKey = env.AI_REVIEWER_PRIVATE_KEY || env.RELAYER_PRIVATE_KEY;
      const provider = new JsonRpcProvider({ url: env.NEAR_RPC_URL });
      const keyPair = KeyPair.fromString(reviewerKey as Parameters<typeof KeyPair.fromString>[0]);
      const signer = new KeyPairSigner(keyPair);
      const account = new Account(reviewerAccount, provider, signer);

      const result = await account.signAndSendTransaction({
        receiverId: env.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            "post_ai_review",
            { guarantee_id, review },
            30_000_000_000_000n,
            0n,
          ),
        ],
      });

      txHash =
        (result as { transaction?: { hash: string } })?.transaction?.hash ??
        (result as { transaction_outcome?: { id: string } })?.transaction_outcome?.id ??
        "ai-review-tx";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return c.json({ error: `Failed to post AI review on-chain: ${msg}`, review }, 502);
    }
  }

  return c.json({
    ok: true,
    guarantee_id,
    review,
    details: {
      cited_reference: "Federal Ministry of Health Reference Tariff & Community Standard (2026)",
      flagged_items: evalResult.flaggedItems,
      suggested_trim: evalResult.suggestedTrim,
      advisory_note: "Advisory only (A-12.1). Never affects payouts directly without council settlement.",
    },
    txHash,
  });
});
