// Write simulation results to CSV (A-10.2).
import * as fs from "node:fs";
import * as path from "node:path";
import type { ScenarioSummary } from "./types.js";

export const writeCsv = (
  summaries: ScenarioSummary[],
  outPath: string,
): void => {
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const lines: string[] = [];

  // Summary section
  lines.push("# Scenario Solvency Summary");
  lines.push(
    "scenario,runs,months,prob_insolvent,prob_denied_by_cap,mean_final_balance_usd,min_final_balance_usd,p5_final_balance_usd,max_final_balance_usd",
  );

  for (const s of summaries) {
    lines.push(
      [
        s.scenario,
        s.runs,
        s.months,
        (s.probInsolvent * 100).toFixed(2) + "%",
        (s.probDeniedByCap * 100).toFixed(2) + "%",
        s.meanFinalBalanceUsd.toFixed(2),
        s.minFinalBalanceUsd.toFixed(2),
        s.p5FinalBalanceUsd.toFixed(2),
        s.maxFinalBalanceUsd.toFixed(2),
      ].join(","),
    );
  }

  lines.push("");
  // Monthly progression section
  lines.push("# Monthly Trajectory (Averages)");
  lines.push("scenario,month,avg_balance_usd,avg_exposure_bps");

  for (const s of summaries) {
    for (let m = 0; m < s.months; m++) {
      const avgBal = s.averageMonthlyBalanceUsd[m] ?? 0;
      const avgExp = s.averageMonthlyExposureBps[m] ?? 0;
      lines.push(
        [s.scenario, m + 1, avgBal.toFixed(2), Math.round(avgExp)].join(","),
      );
    }
  }

  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
};
