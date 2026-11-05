// Types for the acceptance test demo script (P11 / PRD §8).
import { JsonRpcProvider } from "near-api-js";
import { type ViewClient } from "@admit/core";
import { type AccountsConfig } from "../lib/accounts.js";

export interface DemoContext {
  cfg: AccountsConfig;
  poolId: number;
  provider: JsonRpcProvider;
  viewClient: ViewClient;
  memberAccount: string;
  hospitalAccount: string;
  hospitalName: string;
  councilAccount: string;
  guaranteeId?: number | undefined;
  guaranteeCode?: string | undefined;
  simulated?: boolean | undefined;
}

export type DemoStep = (ctx: DemoContext) => Promise<void>;
