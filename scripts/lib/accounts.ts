// Load/create testnet accounts from .env; prefer function-call keys (A-6.1).
import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { KeyPair } from "near-api-js";

export const AccountsEnvSchema = z.object({
  NEAR_NETWORK: z.enum(["testnet", "mainnet"]).default("testnet"),
  NEAR_RPC_URL: z.string().default("https://rpc.testnet.near.org"),
  ADMIT_CONTRACT: z.string().min(1, "ADMIT_CONTRACT is required"),
  TOKEN_CONTRACT: z.string().min(1, "TOKEN_CONTRACT is required"),
  DEPLOYER_ACCOUNT: z.string().min(1, "DEPLOYER_ACCOUNT is required"),
  DEPLOYER_PRIVATE_KEY: z.string().min(1, "DEPLOYER_PRIVATE_KEY is required"),
  COUNCIL_ACCOUNTS: z
    .string()
    .optional()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  HOSPITAL_ACCOUNTS: z
    .string()
    .optional()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  MEMBER_ACCOUNTS: z
    .string()
    .optional()
    .default("")
    .transform((val) =>
      val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  COUNCIL_DAO: z.string().optional().default(""),
  RELAYER_ACCOUNT: z.string().optional().default(""),
  RELAYER_PRIVATE_KEY: z.string().optional().default(""),
});

export type AccountsConfig = z.infer<typeof AccountsEnvSchema>;

export function parseEnvContent(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      result[key] = val;
    }
  }
  return result;
}

export const loadAccounts = async (
  envOverride?: Record<string, string | undefined>,
): Promise<AccountsConfig> => {
  let envToValidate: Record<string, string | undefined> = {};

  if (envOverride) {
    envToValidate = { ...envOverride };
  } else {
    const candidates = [
      path.resolve(process.cwd(), ".env"),
      path.resolve(process.cwd(), "../.env"),
      path.resolve(process.cwd(), "../../.env"),
    ];

    let foundFileContent: string | null = null;
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        foundFileContent = fs.readFileSync(cand, "utf-8");
        break;
      }
    }

    const fileEnv = foundFileContent ? parseEnvContent(foundFileContent) : {};
    envToValidate = { ...fileEnv, ...process.env };
  }

  const parsed = AccountsEnvSchema.parse(envToValidate);

  return Object.freeze({
    ...parsed,
    [Symbol.for("nodejs.util.inspect.custom")]() {
      return {
        ...parsed,
        DEPLOYER_PRIVATE_KEY: "[REDACTED]",
        RELAYER_PRIVATE_KEY: parsed.RELAYER_PRIVATE_KEY ? "[REDACTED]" : "",
      };
    },
  });
};

export const getKeyPair = (
  accountId: string,
  cfg?: AccountsConfig,
): KeyPair => {
  if (cfg && accountId === cfg.DEPLOYER_ACCOUNT && cfg.DEPLOYER_PRIVATE_KEY) {
    return KeyPair.fromString(cfg.DEPLOYER_PRIVATE_KEY as Parameters<typeof KeyPair.fromString>[0]);
  }
  if (cfg && accountId === cfg.RELAYER_ACCOUNT && cfg.RELAYER_PRIVATE_KEY) {
    return KeyPair.fromString(cfg.RELAYER_PRIVATE_KEY as Parameters<typeof KeyPair.fromString>[0]);
  }
  const network = cfg?.NEAR_NETWORK ?? "testnet";
  const credPath = path.join(os.homedir(), ".near-credentials", network, `${accountId}.json`);
  if (fs.existsSync(credPath)) {
    const raw = JSON.parse(fs.readFileSync(credPath, "utf-8"));
    const key = raw.private_key || raw.secret_key;
    if (key) {
      return KeyPair.fromString(key as Parameters<typeof KeyPair.fromString>[0]);
    }
  }
  throw new Error(`No keypair found for account ${accountId}`);
};
