// Demo Step 3: Hospital verifies 6-character code and accepts admission (A-11.3).
// State assumed:
// - Guarantee issued with code in step 2 (A-11.2)
import { Account, actions, KeyPairSigner } from "near-api-js";
import { type DemoContext } from "./types.js";
import { step, link, fail } from "../lib/log.js";
import { codeHash, calls } from "@admit/core";
import { getKeyPair } from "../lib/accounts.js";

export async function step3(ctx: DemoContext): Promise<void> {
  step(3, "Acceptance Test Step 3: Hospital Code Verification & Acceptance");

  if (ctx.guaranteeId === undefined || !ctx.guaranteeCode) {
    fail("Guarantee ID or Code missing from context. Run step 2 first.");
  }

  if (ctx.simulated) {
    console.log(`✔ Simulated Hospital verified code "${ctx.guaranteeCode}" and accepted guarantee #${ctx.guaranteeId}. Expiry stopped.`);
    return;
  }

  const guaranteeBefore = await ctx.viewClient.getGuarantee(ctx.guaranteeId);
  if (!guaranteeBefore) {
    fail(`Guarantee #${ctx.guaranteeId} not found`);
  }

  if (
    guaranteeBefore.status === "Accepted" ||
    guaranteeBefore.status === "Claimed" ||
    guaranteeBefore.status === "Disputed" ||
    guaranteeBefore.status === "Settled"
  ) {
    console.log(
      `✔ Guarantee #${ctx.guaranteeId} is already Accepted (status: ${guaranteeBefore.status}). Expiry countdown disabled.`,
    );
    return;
  }

  console.log(`Hospital intake desk scans QR and verifies code "${ctx.guaranteeCode}"...`);
  const localComputedHash = await codeHash(ctx.guaranteeCode, ctx.guaranteeId);

  // Compare byte arrays
  const onChainHash = guaranteeBefore.code_hash;
  const matches =
    onChainHash.length === localComputedHash.length &&
    onChainHash.every((val, idx) => val === localComputedHash[idx]);

  if (!matches) {
    fail(`Intake code verification failed! Code "${ctx.guaranteeCode}" does not match hash.`);
  }
  console.log(`✔ Intake code matched on-chain hash.`);

  // Hospital accepts guarantee on chain
  const hospitalKp = getKeyPair(ctx.hospitalAccount, ctx.cfg);
  const hospitalSigner = new KeyPairSigner(hospitalKp);
  const hospitalAcc = new Account(ctx.hospitalAccount, ctx.provider, hospitalSigner);

  const acceptCall = calls.hospitalAccept(ctx.guaranteeId);
  try {
    const tx = await hospitalAcc.signAndSendTransaction({
      receiverId: ctx.cfg.ADMIT_CONTRACT,
      actions: [
        actions.functionCall(
          acceptCall.methodName,
          acceptCall.args,
          acceptCall.gas,
          acceptCall.deposit,
        ),
      ],
    });

    const txHash =
      (tx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-success";
    link("tx", txHash, ctx.cfg.NEAR_NETWORK);
  } catch {
    // Assert on-chain state below
  }

  // Verify updated state
  const guaranteeAfter = await ctx.viewClient.getGuarantee(ctx.guaranteeId);
  if (!guaranteeAfter) {
    fail(`Guarantee #${ctx.guaranteeId} disappeared after acceptance`);
  }

  if (guaranteeAfter.status !== "Accepted") {
    fail(`Expected guarantee status "Accepted", found "${guaranteeAfter.status}"`);
  }

  console.log(`✔ Guarantee #${ctx.guaranteeId} is Accepted. Expiry countdown disabled (non-negotiable decision 7).`);
}
