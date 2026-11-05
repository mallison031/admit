// Demo Step 4: Claim 280, member disputes, council trims 30, hospital paid 250 (A-11.4).
// State assumed:
// - Guarantee Accepted by hospital in step 3 (A-11.3)
import { Account, actions, KeyPairSigner } from "near-api-js";
import { type DemoContext } from "./types.js";
import { step, link, fail } from "../lib/log.js";
import { calls } from "@admit/core";
import { getKeyPair } from "../lib/accounts.js";

export async function step4(ctx: DemoContext): Promise<void> {
  step(4, "Acceptance Test Step 4: Medical Claim (280 USDC), Dispute & Council Settlement (250 USDC)");

  if (ctx.guaranteeId === undefined) {
    fail("Guarantee ID missing from context. Run step 2 and 3 first.");
  }
  const guaranteeId = ctx.guaranteeId;

  if (ctx.simulated) {
    console.log(`✔ Simulated Hospital claimed 280 USDC, Member disputed, Council trimmed 30 USDC, Paid 250 USDC.`);
    return;
  }

  let g = await ctx.viewClient.getGuarantee(guaranteeId);
  if (!g) {
    fail(`Guarantee #${guaranteeId} not found`);
  }

  if (g.status === "Settled") {
    console.log(`✔ Guarantee #${guaranteeId} already Settled (net payout: 250 USDC).`);
    return;
  }

  // 1. Hospital submits claim for 280 tUSDC if not already claimed
  if (g.status === "Accepted") {
    console.log(`Hospital submits emergency medical discharge bill: 280 USDC...`);
    const hospitalKp = getKeyPair(ctx.hospitalAccount, ctx.cfg);
    const hospitalSigner = new KeyPairSigner(hospitalKp);
    const hospitalAcc = new Account(ctx.hospitalAccount, ctx.provider, hospitalSigner);

    const claimCall = calls.hospitalClaim({
      guarantee_id: guaranteeId,
      amount: "280000000",
      file_hash: Array.from(Buffer.alloc(32, 7)),
    });

    try {
      const claimTx = await hospitalAcc.signAndSendTransaction({
        receiverId: ctx.cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            claimCall.methodName,
            claimCall.args,
            claimCall.gas,
            claimCall.deposit,
          ),
        ],
      });
      const claimTxHash =
        (claimTx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-claim";
      link("tx", claimTxHash, ctx.cfg.NEAR_NETWORK);
    } catch {
      // Assert on-chain state below
    }

    g = await ctx.viewClient.getGuarantee(guaranteeId);
    if (!g || g.status !== "Claimed") {
      fail(`Expected guarantee status "Claimed", found "${g?.status}"`);
    }
    console.log(`✔ Hospital claim submitted: ${g.claim?.amount} raw units`);
  }

  // 2. Member disputes within the dispute window if not already disputed
  if (g && g.status === "Claimed") {
    console.log(`Member reviews itemized bill and files dispute on line item 4...`);
    const memberKp = getKeyPair(ctx.memberAccount, ctx.cfg);
    const memberSigner = new KeyPairSigner(memberKp);
    const memberAcc = new Account(ctx.memberAccount, ctx.provider, memberSigner);

    const disputeCall = calls.memberDispute({
      guarantee_id: guaranteeId,
      reason: "Line item 4 duplicate lab panel charge",
    });

    try {
      const disputeTx = await memberAcc.signAndSendTransaction({
        receiverId: ctx.cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            disputeCall.methodName,
            disputeCall.args,
            disputeCall.gas,
            disputeCall.deposit,
          ),
        ],
      });
      const disputeTxHash =
        (disputeTx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-dispute";
      link("tx", disputeTxHash, ctx.cfg.NEAR_NETWORK);
    } catch {
      // Assert on-chain state below
    }

    g = await ctx.viewClient.getGuarantee(guaranteeId);
    if (!g || g.status !== "Disputed") {
      fail(`Expected guarantee status "Disputed", found "${g?.status}"`);
    }
    console.log(`✔ Guarantee transitioned to Disputed status`);
  }

  // 3. Council reviews dispute and settles with 30 USDC adjustment (payout: 250 USDC)
  if (g && g.status === "Disputed") {
    console.log(`Council reviews dispute evidence and trims 30 USDC excess...`);
    const councilAccount = ctx.cfg.COUNCIL_ACCOUNTS[0] || ctx.cfg.DEPLOYER_ACCOUNT;
    const councilKp = getKeyPair(councilAccount, ctx.cfg);
    const councilSigner = new KeyPairSigner(councilKp);
    const councilAcc = new Account(councilAccount, ctx.provider, councilSigner);

    const settleCall = calls.settle({
      guarantee_id: guaranteeId,
      adjustment: "30000000", // 30 tUSDC trimmed
      reason: "Council audited bill and trimmed 30 USDC duplicate lab charges",
    });

    try {
      const settleTx = await councilAcc.signAndSendTransaction({
        receiverId: ctx.cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            settleCall.methodName,
            settleCall.args,
            settleCall.gas,
            settleCall.deposit,
          ),
        ],
      });
      const settleTxHash =
        (settleTx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-settle";
      link("tx", settleTxHash, ctx.cfg.NEAR_NETWORK);
    } catch {
      // Assert on-chain state below
    }
  }

  // 4. Verify Settled state
  g = await ctx.viewClient.getGuarantee(guaranteeId);
  if (!g || g.status !== "Settled") {
    fail(`Expected guarantee status "Settled", found "${g?.status}"`);
  }

  if (g.claim?.adjustment !== "30000000") {
    fail(`Expected adjustment "30000000", found "${g.claim?.adjustment}"`);
  }

  console.log(`✔ Guarantee #${guaranteeId} Settled! Hospital received 250 USDC net.`);
}
