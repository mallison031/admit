// Demo Step 2: Delegate with zero NEAR requests 300 USDC guarantee (A-11.2).
// State assumed:
// - Pool 0 verified with member1 and St. Nicholas Clinic (A-11.1)
// - Relayer configured and funded to sponsor gas for delegate actions (A-8.4)
import { Account, actions, KeyPairSigner } from "near-api-js";
import { type DemoContext } from "./types.js";
import { step, link, fail } from "../lib/log.js";
import { generateCode, codeHash, calls } from "@admit/core";
import { getKeyPair } from "../lib/accounts.js";

export async function step2(ctx: DemoContext): Promise<void> {
  step(2, "Acceptance Test Step 2: Emergency Guarantee Request (2:04 am)");

  console.log(`2:04 am: Member's brother on a delegate phone with 0 NEAR requests 300 USDC guarantee...`);
  const code = generateCode();
  ctx.guaranteeCode = code;

  // Check if an active guarantee already exists for this member
  const existing = await ctx.viewClient.listGuarantees(ctx.poolId, 0, 100);
  const activeForMember = existing.find(
    (g) =>
      g.member === ctx.memberAccount &&
      (g.status === "Issued" || g.status === "Accepted" || g.status === "Claimed" || g.status === "Disputed"),
  );

  if (activeForMember) {
    ctx.guaranteeId = activeForMember.id;
    console.log(`✔ Active guarantee #${activeForMember.id} (${activeForMember.status}) found for member: 300 USDC`);
    return;
  }

  const nextId = existing.length;
  const ch = await codeHash(code, nextId);
  const chArray = Array.from(ch);

  console.log(`Generated emergency intake code: ${code} (hash: ${Buffer.from(ch).toString("hex").slice(0, 12)}...)`);

  if (ctx.simulated) {
    ctx.guaranteeId = nextId;
    console.log(`✔ Simulated Guarantee #${nextId} issued with status: Issued`);
    return;
  }

  // The relayer signs and relays the request on behalf of the delegate
  const relayerKp = getKeyPair(ctx.cfg.RELAYER_ACCOUNT, ctx.cfg);
  const relayerSigner = new KeyPairSigner(relayerKp);
  const relayerAcc = new Account(ctx.cfg.RELAYER_ACCOUNT, ctx.provider, relayerSigner);

  const reqCall = calls.requestGuarantee({
    pool_id: ctx.poolId,
    member: ctx.memberAccount,
    hospital: ctx.hospitalAccount,
    amount: "300000000", // 300 tUSDC
    code_hash: chArray,
    patient_initials: "M.D.",
  });

  try {
    const tx = await relayerAcc.signAndSendTransaction({
      receiverId: ctx.cfg.ADMIT_CONTRACT,
      actions: [
        actions.functionCall(
          reqCall.methodName,
          reqCall.args,
          reqCall.gas,
          reqCall.deposit,
        ),
      ],
    });

    const txHash =
      (tx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-success";
    link("tx", txHash, ctx.cfg.NEAR_NETWORK);
  } catch {
    // Transaction may have confirmed despite RPC timeout; assert on-chain state below
  }

  // Verify guarantee state
  const guarantee = await ctx.viewClient.getGuarantee(nextId);
  if (!guarantee) {
    fail(`Guarantee #${nextId} was not created on chain`);
  }

  if (guarantee.status !== "Issued") {
    fail(`Expected guarantee status "Issued", found "${guarantee.status}"`);
  }

  if (guarantee.amount !== "300000000") {
    fail(`Expected guarantee amount "300000000", found "${guarantee.amount}"`);
  }

  ctx.guaranteeId = nextId;
  console.log(`✔ Guarantee #${nextId} issued on-chain: 300 USDC guaranteed for patient initials M.D.`);
}
