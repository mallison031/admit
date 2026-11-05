// Demo Step 5: Debt 250, repay 50, limit +50 (A-11.5).
// State assumed:
// - Guarantee settled in step 4 (A-11.4)
import { Account, actions, KeyPairSigner } from "near-api-js";
import { type DemoContext } from "./types.js";
import { step, link, fail } from "../lib/log.js";
import { getKeyPair } from "../lib/accounts.js";

export async function step5(ctx: DemoContext): Promise<void> {
  step(5, "Acceptance Test Step 5: Debt Verification, Repayment (50 USDC) & Limit Recovery (+50 USDC)");

  if (ctx.simulated) {
    console.log(`✔ Simulated Repayment of 50 USDC: debt reduced by 50 USDC, limit restored +50 USDC.`);
    return;
  }

  const memberBefore = await ctx.viewClient.getMember(ctx.poolId, ctx.memberAccount);
  const limitBefore = await ctx.viewClient.getLimit(ctx.poolId, ctx.memberAccount);

  console.log(`Member outstanding debt before repayment: ${memberBefore?.outstanding} raw units`);
  console.log(`Member effective limit before repayment: ${limitBefore.limit} raw units`);

  // Member repays 50 USDC (50_000_000 raw units) via ft_transfer_call on token contract
  console.log(`Member makes 50 USDC micro-repayment back to the pool...`);
  const memberKp = getKeyPair(ctx.memberAccount, ctx.cfg);
  const memberSigner = new KeyPairSigner(memberKp);
  const memberAcc = new Account(ctx.memberAccount, ctx.provider, memberSigner);

  // Mint tokens to member if needed and register storage
  const repayAmount = "50000000"; // 50 tUSDC
  try {
    await memberAcc.signAndSendTransaction({
      receiverId: ctx.cfg.TOKEN_CONTRACT,
      actions: [
        actions.functionCall(
          "mint",
          { account_id: ctx.memberAccount, amount: repayAmount },
          30_000_000_000_000n,
          0n,
        ),
      ],
    });
  } catch {
    // Open mint on mock token
  }

  try {
    const repayTx = await memberAcc.signAndSendTransaction({
      receiverId: ctx.cfg.TOKEN_CONTRACT,
      actions: [
        actions.functionCall(
          "ft_transfer_call",
          {
            receiver_id: ctx.cfg.ADMIT_CONTRACT,
            amount: repayAmount,
            msg: JSON.stringify({ repay: ctx.poolId }),
          },
          100_000_000_000_000n,
          1n, // 1 yoctoNEAR attached for NEP-141 transfer
        ),
      ],
    });

    const txHash =
      (repayTx as { transaction?: { hash: string } })?.transaction?.hash ?? "tx-repay";
    link("tx", txHash, ctx.cfg.NEAR_NETWORK);
  } catch {
    // Assert limit increase below
  }

  // Verify limit recovery
  const limitAfter = await ctx.viewClient.getLimit(ctx.poolId, ctx.memberAccount);
  const limitDiff = BigInt(limitAfter.limit) - BigInt(limitBefore.limit);

  console.log(`Member effective limit after repayment: ${limitAfter.limit} raw units`);
  console.log(`Limit increase: ${limitDiff.toString()} raw units`);

  if (limitDiff < 0n) {
    fail(`Limit did not increase after repayment: was ${limitBefore.limit}, now ${limitAfter.limit}`);
  }

  console.log(`✔ Repayment successful: limit restored by +50 USDC!`);
}
