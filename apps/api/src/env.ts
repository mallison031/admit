// zod-validated env; fails fast on missing vars (A-8.1). Keep in sync with .env.example.
import { z } from "zod";

export const Env = z.object({
  NEAR_NETWORK: z.enum(["testnet", "mainnet"]),
  NEAR_RPC_URL: z.url(),
  ADMIT_CONTRACT: z.string(),
  RELAYER_ACCOUNT: z.string(),
  RELAYER_PRIVATE_KEY: z.string(),
  API_PORT: z.coerce.number().int().default(8787),
  RELAY_RATE_LIMIT_PER_MIN: z.coerce.number().int().default(20),
  ONECLICK_API_KEY: z.string().optional(),
});
export type Env = z.infer<typeof Env>;

export const loadEnv = (env: Record<string, string | undefined> = process.env): Env =>
  Env.parse(env);
