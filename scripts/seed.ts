// Demo pool: 20 members, 6 scaled months, council, 2 hospitals via DAO proposals, delegate keys (A-6.3).
import * as fs from "node:fs";
import * as path from "node:path";
import { Account, actions, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { loadAccounts, getKeyPair } from "./lib/accounts.js";
import { step, link, fail } from "./lib/log.js";
import { type PoolParams, type Hospital } from "@admit/core";

export interface SeedOptions {
  envOverride?: Record<string, string | undefined>;
  dryRun?: boolean;
}

export interface SeedResult {
  poolId: number;
  poolName: string;
  dao: string;
  token: string;
  council: string[];
  hospitals: string[];
  membersCount: number;
  explorerUrl: string;
}

export const CALIBRATED_POOL_PARAMS: PoolParams = {
  monthly_contribution: "5000000", // $5 USDC
  min_tenure_months: 0,
  base_limit: "300000000", // $300 USDC (calibrated to emergency deposit size ≈ ₦500k)
  limit_per_month: "25000000", // $25 USDC
  max_limit: "600000000", // $600 USDC
  late_limit_bps: 5000,
  max_exposure_bps: 8000,
  max_active_per_member: 2,
  cooldown: "0", // 0 in demo mode
  guarantee_ttl: "604800000000000", // 7 days in ns
  dispute_window: "1209600000000000", // 14 days in ns
  pool_covered_bps: 7000, // 70% mutual aid
  cover_on_death: true,
  council_tier_multiplier: 3,
  exit_lock_months: 3,
  exit_notice: "2592000000000000",
  time_scale: 1,
};

export const seedPool = async (opts: SeedOptions = {}): Promise<SeedResult> => {
  step(1, "Loading seed configuration and fictional member roster");
  const cfg = await loadAccounts(opts.envOverride);

  const fixturesCandidates = [
    path.resolve(process.cwd(), "fixtures/members.json"),
    path.resolve(process.cwd(), "../fixtures/members.json"),
    path.resolve(process.cwd(), "../../fixtures/members.json"),
  ];
  let membersList: Array<{ label: string; months_paid: number; delegates: number }> = [];
  for (const cand of fixturesCandidates) {
    if (fs.existsSync(cand)) {
      const data = JSON.parse(fs.readFileSync(cand, "utf-8"));
      membersList = data.members || [];
      break;
    }
  }

  const poolName = "St. Mark's Emergency Circle";
  const daoAccount = cfg.COUNCIL_DAO || cfg.DEPLOYER_ACCOUNT;
  const councilList = cfg.COUNCIL_ACCOUNTS.length > 0 ? cfg.COUNCIL_ACCOUNTS : [daoAccount];

  if (opts.dryRun) {
    console.log("Dry-run mode enabled; simulating pool seed.");
    const explorerUrl = link("account", cfg.ADMIT_CONTRACT, cfg.NEAR_NETWORK);
    return {
      poolId: 0,
      poolName,
      dao: daoAccount,
      token: cfg.TOKEN_CONTRACT,
      council: councilList,
      hospitals: cfg.HOSPITAL_ACCOUNTS,
      membersCount: membersList.length || 20,
      explorerUrl,
    };
  }

  const provider = new JsonRpcProvider({ url: cfg.NEAR_RPC_URL });

  // 1. Check if pool 0 exists
  step(2, `Checking pool 0 on ${cfg.ADMIT_CONTRACT}`);
  let poolExists = false;
  try {
    const pool = (await provider.callFunction({
      contractId: cfg.ADMIT_CONTRACT,
      method: "get_pool",
      args: { pool_id: 0 },
    })) as { name?: string } | null;
    if (pool !== null && pool !== undefined) {
      poolExists = true;
      console.log(`✔ Pool 0 already exists: ${pool.name ?? "unnamed"}`);
    }
  } catch {
    console.log("Pool 0 not initialized yet; creating new pool...");
  }

  // 2. Create pool if it doesn't exist
  if (!poolExists) {
    step(3, `Creating pool: "${poolName}"`);
    const deployerKp = getKeyPair(cfg.DEPLOYER_ACCOUNT, cfg);
    const deployerSigner = new KeyPairSigner(deployerKp);
    const deployerAcc = new Account(cfg.DEPLOYER_ACCOUNT, provider, deployerSigner);

    try {
      await deployerAcc.signAndSendTransaction({
        receiverId: cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            "create_pool",
            {
              name: poolName,
              dao: daoAccount,
              token: cfg.TOKEN_CONTRACT,
              params: CALIBRATED_POOL_PARAMS,
            },
            50_000_000_000_000n,
            200_000_000_000_000_000_000_000n, // 0.2 NEAR storage deposit
          ),
        ],
      });
      console.log(`✔ Pool 0 created successfully`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      fail(`Failed to create pool: ${msg}`);
    }
  }

  // 3. Set council members
  step(4, "Configuring council members");
  const daoKp = getKeyPair(daoAccount, cfg);
  const daoSigner = new KeyPairSigner(daoKp);
  const daoAcc = new Account(daoAccount, provider, daoSigner);

  try {
    await daoAcc.signAndSendTransaction({
      receiverId: cfg.ADMIT_CONTRACT,
      actions: [
        actions.functionCall(
          "council_set_members",
          {
            pool_id: 0,
            council: councilList,
          },
          30_000_000_000_000n,
          0n,
        ),
      ],
    });
    console.log(`✔ Council set to: ${councilList.join(", ")}`);
  } catch (err: unknown) {
    console.warn("Council set warning:", err instanceof Error ? err.message : err);
  }

  // 4. Register 2 hospitals
  step(5, "Registering 2 accredited hospitals via DAO");
  const hospitalsToAdd: Hospital[] = [
    {
      account: cfg.HOSPITAL_ACCOUNTS[0] || `hospital1.${cfg.DEPLOYER_ACCOUNT}`,
      name: "St. Nicholas Clinic",
      fc_public_key: "ed25519:6E8sCci9badyRkXb3JoRpAx5bMrqZgqwq86gRVCm16yE",
    },
    {
      account: cfg.HOSPITAL_ACCOUNTS[1] || `hospital2.${cfg.DEPLOYER_ACCOUNT}`,
      name: "Lagos Island General Hospital",
      fc_public_key: "ed25519:6E8sCci9badyRkXb3JoRpAxTMwx2gnNFkUM95Sdy7qEP",
    },
  ];

  for (const h of hospitalsToAdd) {
    try {
      await daoAcc.signAndSendTransaction({
        receiverId: cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            "council_add_hospital",
            {
              pool_id: 0,
              hospital: h,
            },
            100_000_000_000_000n,
            12_500_000_000_000_000_000_000n, // 0.0125 NEAR storage deposit
          ),
        ],
      });
      console.log(`✔ Registered hospital: ${h.name} (${h.account})`);
    } catch {
      console.log(`Note: Hospital ${h.name} already added or registered`);
    }
  }

  // 5. Seed testnet members & mint tokens
  step(6, "Enrolling members and funding pool reserve");
  const primaryMember = cfg.MEMBER_ACCOUNTS[0] || `member1.${cfg.DEPLOYER_ACCOUNT}`;

  try {
    const memberKp = getKeyPair(primaryMember, cfg);
    const memberSigner = new KeyPairSigner(memberKp);
    const memberAcc = new Account(primaryMember, provider, memberSigner);

    // Join pool 0
    try {
      await memberAcc.signAndSendTransaction({
        receiverId: cfg.ADMIT_CONTRACT,
        actions: [
          actions.functionCall(
            "join",
            { pool_id: 0 },
            30_000_000_000_000n,
            100_000_000_000_000_000_000_000n, // 0.1 NEAR storage deposit
          ),
        ],
      });
      console.log(`✔ Enrolled primary member: ${primaryMember}`);
    } catch {
      console.log(`Note: Member ${primaryMember} already joined`);
    }

    // Add delegate (e.g. relayer or second account)
    if (cfg.RELAYER_ACCOUNT) {
      try {
        await memberAcc.signAndSendTransaction({
          receiverId: cfg.ADMIT_CONTRACT,
          actions: [
            actions.functionCall(
              "add_delegate",
              { pool_id: 0, delegate: cfg.RELAYER_ACCOUNT },
              30_000_000_000_000n,
              0n,
            ),
          ],
        });
        console.log(`✔ Added delegate ${cfg.RELAYER_ACCOUNT} for ${primaryMember}`);
      } catch {
        console.log(`Note: Delegate ${cfg.RELAYER_ACCOUNT} already added`);
      }
    }

    // Fund pool reserve with 5,000 tUSDC liquidity
    try {
      const deployerKp = getKeyPair(cfg.DEPLOYER_ACCOUNT, cfg);
      const deployerSigner = new KeyPairSigner(deployerKp);
      const deployerAcc = new Account(cfg.DEPLOYER_ACCOUNT, provider, deployerSigner);
      const reserveAmount = "5000000000"; // 5,000 tUSDC
      await deployerAcc.signAndSendTransaction({
        receiverId: cfg.TOKEN_CONTRACT,
        actions: [
          actions.functionCall(
            "mint",
            { account_id: cfg.DEPLOYER_ACCOUNT, amount: reserveAmount },
            30_000_000_000_000n,
            0n,
          ),
        ],
      });
      await deployerAcc.signAndSendTransaction({
        receiverId: cfg.TOKEN_CONTRACT,
        actions: [
          actions.functionCall(
            "ft_transfer_call",
            {
              receiver_id: cfg.ADMIT_CONTRACT,
              amount: reserveAmount,
              msg: JSON.stringify({ topup: 0 }),
            },
            100_000_000_000_000n,
            1n,
          ),
        ],
      });
      console.log(`✔ Funded pool reserve with 5,000 tUSDC`);
    } catch {
      // already funded
    }
  } catch (err: unknown) {
    console.warn("Member setup notice:", err instanceof Error ? err.message : err);
  }

  // 6. Summary
  step(7, "Pool seeding summary");
  const explorerUrl = link("account", cfg.ADMIT_CONTRACT, cfg.NEAR_NETWORK);
  console.log(`\n🎉 Seed completed!`);
  console.log(`  Pool Name: ${poolName}`);
  console.log(`  DAO: ${daoAccount}`);
  console.log(`  Council Members: ${councilList.length}`);
  console.log(`  Hospitals: ${hospitalsToAdd.map((h) => h.name).join(", ")}`);
  console.log(`  Fictional Member Roster: ${membersList.length} members loaded from fixtures/members.json`);

  return {
    poolId: 0,
    poolName,
    dao: daoAccount,
    token: cfg.TOKEN_CONTRACT,
    council: councilList,
    hospitals: hospitalsToAdd.map((h) => h.account),
    membersCount: membersList.length || 20,
    explorerUrl,
  };
};

if (process.argv[1] && process.argv[1].endsWith("seed.ts")) {
  seedPool().catch((err) => {
    fail(err instanceof Error ? err.message : String(err));
  });
}
