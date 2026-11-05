// Build + deploy mock-ft and admit-pool, init; idempotent (A-6.1).
import * as fs from "node:fs";
import * as path from "node:path";
import { Account, actions, JsonRpcProvider, KeyPairSigner } from "near-api-js";
import { loadAccounts, getKeyPair } from "./lib/accounts.js";
import { step, link, fail } from "./lib/log.js";

export interface DeployOptions {
  envOverride?: Record<string, string | undefined>;
  dryRun?: boolean;
}

export interface DeployResult {
  tokenContract: string;
  admitContract: string;
  tokenExplorer: string;
  admitExplorer: string;
  tokenNewlyDeployed: boolean;
  admitNewlyDeployed: boolean;
}

const findWasm = (subpath: string): string => {
  const candidates = [
    path.resolve(process.cwd(), subpath),
    path.resolve(process.cwd(), "..", subpath),
    path.resolve(process.cwd(), "../..", subpath),
  ];
  for (const cand of candidates) {
    if (fs.existsSync(cand)) return cand;
  }
  throw new Error(`WASM binary not found at ${subpath}. Run 'pnpm build:contract' first.`);
};

export const deployTestnet = async (opts: DeployOptions = {}): Promise<DeployResult> => {
  step(1, "Loading deployment configuration");
  const cfg = await loadAccounts(opts.envOverride);

  const mockFtWasmPath = findWasm("target/near/mock_ft/mock_ft.wasm");
  const admitPoolWasmPath = findWasm("target/near/admit_pool/admit_pool.wasm");

  const mockFtBytes = fs.readFileSync(mockFtWasmPath);
  const admitPoolBytes = fs.readFileSync(admitPoolWasmPath);

  if (opts.dryRun) {
    console.log("Dry-run mode enabled; skipping on-chain transactions.");
    const tokenExplorer = link("account", cfg.TOKEN_CONTRACT, cfg.NEAR_NETWORK);
    const admitExplorer = link("account", cfg.ADMIT_CONTRACT, cfg.NEAR_NETWORK);
    return {
      tokenContract: cfg.TOKEN_CONTRACT,
      admitContract: cfg.ADMIT_CONTRACT,
      tokenExplorer,
      admitExplorer,
      tokenNewlyDeployed: false,
      admitNewlyDeployed: false,
    };
  }

  const provider = new JsonRpcProvider({ url: cfg.NEAR_RPC_URL });

  // 1. Deploy & init mock-ft if needed
  step(2, `Checking & deploying token contract: ${cfg.TOKEN_CONTRACT}`);
  let tokenNewlyDeployed = false;
  try {
    const tokenAccountInfo = (await provider.query({
      request_type: "view_account",
      finality: "final",
      account_id: cfg.TOKEN_CONTRACT,
    })) as { code_hash: string };

    const isEmptyCode =
      !tokenAccountInfo.code_hash ||
      tokenAccountInfo.code_hash === "11111111111111111111111111111111";

    if (isEmptyCode) {
      console.log(`Deploying mock_ft (${mockFtBytes.length} bytes) to ${cfg.TOKEN_CONTRACT}...`);
      const tokenKp = getKeyPair(cfg.TOKEN_CONTRACT, cfg);
      const tokenSigner = new KeyPairSigner(tokenKp);
      const tokenAcc = new Account(cfg.TOKEN_CONTRACT, provider, tokenSigner);
      await tokenAcc.signAndSendTransaction({
        receiverId: cfg.TOKEN_CONTRACT,
        actions: [
          actions.deployContract(mockFtBytes),
          actions.functionCall("new", {}, 30_000_000_000_000n, 0n),
        ],
      });
      tokenNewlyDeployed = true;
      console.log(`✔ mock-ft deployed and initialized on ${cfg.TOKEN_CONTRACT}`);
    } else {
      console.log(`✔ mock-ft contract code already exists on ${cfg.TOKEN_CONTRACT}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Failed to verify or deploy token contract ${cfg.TOKEN_CONTRACT}: ${msg}`);
  }

  // 2. Deploy & init admit-pool if needed
  step(3, `Checking & deploying admit-pool contract: ${cfg.ADMIT_CONTRACT}`);
  let admitNewlyDeployed = false;
  try {
    const admitAccountInfo = (await provider.query({
      request_type: "view_account",
      finality: "final",
      account_id: cfg.ADMIT_CONTRACT,
    })) as { code_hash: string };

    const isEmptyCode =
      !admitAccountInfo.code_hash ||
      admitAccountInfo.code_hash === "11111111111111111111111111111111";

    if (isEmptyCode) {
      console.log(`Deploying admit_pool (${admitPoolBytes.length} bytes) to ${cfg.ADMIT_CONTRACT}...`);
      const admitKp = getKeyPair(cfg.ADMIT_CONTRACT, cfg);
      const admitSigner = new KeyPairSigner(admitKp);
      const admitAcc = new Account(cfg.ADMIT_CONTRACT, provider, admitSigner);
      await admitAcc.signAndSendTransaction({
        receiverId: cfg.ADMIT_CONTRACT,
        actions: [
          actions.deployContract(admitPoolBytes),
          actions.functionCall("new", { ai_reviewer: null }, 30_000_000_000_000n, 0n),
        ],
      });
      admitNewlyDeployed = true;
      console.log(`✔ admit-pool deployed and initialized on ${cfg.ADMIT_CONTRACT}`);
    } else {
      console.log(`✔ admit-pool contract code already exists on ${cfg.ADMIT_CONTRACT}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`Failed to verify or deploy admit-pool contract ${cfg.ADMIT_CONTRACT}: ${msg}`);
  }

  // 3. Register storage for ADMIT_CONTRACT on TOKEN_CONTRACT if needed
  step(4, `Ensuring NEP-145 storage registration for ${cfg.ADMIT_CONTRACT} on ${cfg.TOKEN_CONTRACT}`);
  try {
    const storageRes = await provider.callFunction({
      contractId: cfg.TOKEN_CONTRACT,
      method: "storage_balance_of",
      args: { account_id: cfg.ADMIT_CONTRACT },
    });

    if (!storageRes) {
      console.log(`Registering storage deposit (0.0125 NEAR) on ${cfg.TOKEN_CONTRACT}...`);
      const admitKp = getKeyPair(cfg.ADMIT_CONTRACT, cfg);
      const admitSigner = new KeyPairSigner(admitKp);
      const admitAcc = new Account(cfg.ADMIT_CONTRACT, provider, admitSigner);
      await admitAcc.signAndSendTransaction({
        receiverId: cfg.TOKEN_CONTRACT,
        actions: [
          actions.functionCall(
            "storage_deposit",
            { account_id: cfg.ADMIT_CONTRACT, registration_only: true },
            30_000_000_000_000n,
            12_500_000_000_000_000_000_000n,
          ),
        ],
      });
      console.log(`✔ Storage deposit registered for ${cfg.ADMIT_CONTRACT}`);
    } else {
      console.log(`✔ Storage already registered for ${cfg.ADMIT_CONTRACT}`);
    }
  } catch (err: unknown) {
    console.warn("Storage check/registration warning:", err instanceof Error ? err.message : err);
  }

  // 4. Print explorer links
  step(5, "Deployment summary & explorer links");
  const tokenExplorer = link("account", cfg.TOKEN_CONTRACT, cfg.NEAR_NETWORK);
  const admitExplorer = link("account", cfg.ADMIT_CONTRACT, cfg.NEAR_NETWORK);

  console.log("\n🚀 Deployment complete (idempotent)!");
  return {
    tokenContract: cfg.TOKEN_CONTRACT,
    admitContract: cfg.ADMIT_CONTRACT,
    tokenExplorer,
    admitExplorer,
    tokenNewlyDeployed,
    admitNewlyDeployed,
  };
};

if (process.argv[1] && process.argv[1].endsWith("deploy-testnet.ts")) {
  deployTestnet().catch((err) => {
    fail(err instanceof Error ? err.message : String(err));
  });
}
