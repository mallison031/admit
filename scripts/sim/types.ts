import type { PoolParams } from "@admit/core";

export type ScenarioName = "normal" | "bad_year" | "exit_wave";

export interface ScenarioConfig {
  name: ScenarioName;
  description: string;
  runs: number;
  months: number;
  initialMembers: number;
  initialBalance: bigint; // in 6 decimals
  monthlyEmergencyProb: number;
  billMu: number;
  billSigma: number;
  defaultRate: number; // probability member defaults on repayment
  exitWaveMonth?: number;
  exitWaveFraction?: number;
  poolParams: PoolParams;
}

export interface MonthSnapshot {
  month: number;
  balance: bigint;
  reserved: bigint;
  exposureBps: number;
  activeMembers: number;
  emergenciesCount: number;
  claimsPaid: bigint;
  deniedByCapCount: number;
}

export interface SingleRunResult {
  runIndex: number;
  scenario: ScenarioName;
  insolvent: boolean;
  insolventMonth: number | null;
  totalRequests: number;
  deniedByCap: number;
  finalBalance: bigint;
  monthlySnapshots: MonthSnapshot[];
}

export interface ScenarioSummary {
  scenario: ScenarioName;
  runs: number;
  months: number;
  insolventRuns: number;
  probInsolvent: number;
  totalRequests: number;
  deniedByCapRequests: number;
  probDeniedByCap: number;
  meanFinalBalanceUsd: number;
  minFinalBalanceUsd: number;
  p5FinalBalanceUsd: number;
  maxFinalBalanceUsd: number;
  averageMonthlyExposureBps: number[];
  averageMonthlyBalanceUsd: number[];
}
