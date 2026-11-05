// Demo Step 1: Check seeded state and print pool summary (A-11.1).
// State assumed:
// - Contracts deployed and initialized (A-6.1)
// - Pool 0 seeded with "St. Mark's Emergency Circle", 2 hospitals, council, and primary member (A-6.3)
import { type DemoContext } from "./types.js";
import { step, link, fail } from "../lib/log.js";

export async function step1(ctx: DemoContext): Promise<void> {
  step(1, "Acceptance Test Step 1: Seed State Verification");

  console.log(`Checking seeded state for pool ${ctx.poolId} on ${ctx.cfg.ADMIT_CONTRACT}...`);
  const pool = await ctx.viewClient.getPool(ctx.poolId);
  if (!pool) {
    fail(`Pool ${ctx.poolId} not found on contract ${ctx.cfg.ADMIT_CONTRACT}`);
  }

  if (pool.name !== "St. Mark's Emergency Circle") {
    fail(`Expected pool name "St. Mark's Emergency Circle", found "${pool.name}"`);
  }

  if (pool.hospitals.length < 2) {
    fail(`Expected at least 2 registered hospitals, found ${pool.hospitals.length}`);
  }

  const primaryHospital = pool.hospitals.find(
    (h) => h.account === ctx.hospitalAccount || h.name.includes("St. Nicholas"),
  );
  if (!primaryHospital) {
    fail(`Primary hospital ${ctx.hospitalAccount} not found in pool hospitals registry`);
  }
  ctx.hospitalAccount = primaryHospital.account;
  ctx.hospitalName = primaryHospital.name;

  const member = await ctx.viewClient.getMember(ctx.poolId, ctx.memberAccount);
  if (!member) {
    fail(`Member ${ctx.memberAccount} is not registered in pool ${ctx.poolId}`);
  }

  if (member.standing !== "Good") {
    fail(`Expected member standing "Good", found "${member.standing}"`);
  }

  link("account", ctx.cfg.ADMIT_CONTRACT, ctx.cfg.NEAR_NETWORK);
  link("account", ctx.hospitalAccount, ctx.cfg.NEAR_NETWORK);
  link("account", ctx.memberAccount, ctx.cfg.NEAR_NETWORK);

  console.log(`\n✔ Pool State Verified:`);
  console.log(`  Name: ${pool.name}`);
  console.log(`  DAO: ${pool.dao}`);
  console.log(`  Hospitals: ${pool.hospitals.map((h) => `${h.name} (${h.account})`).join(", ")}`);
  console.log(`  Member: ${member.account} (Standing: ${member.standing})`);
}
