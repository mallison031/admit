// Solvency Monte Carlo using @admit/core limits (A-10.1): 10,000 runs × 24 months;
// scenarios normal / bad_year / exit_wave → docs/simulation/{results.csv, chart.png, summary.md}.

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { renderChart } from "./sim/renderChart.js";
import { getScenarioConfigs, runSimulation } from "./sim/scenarios.js";
import { writeCsv } from "./sim/writeCsv.js";
import { writeSummary } from "./sim/writeSummary.js";

export async function main(runs = 10000): Promise<void> {
  const configs = getScenarioConfigs(runs);
  const startTime = Date.now();

  console.log(`[Simulator] Starting Monte Carlo solvency simulation (${runs.toLocaleString()} runs × 24 months)...`);

  console.log("  Running scenario: normal...");
  const t0 = Date.now();
  const normalSummary = runSimulation(configs.normal, 1001);
  console.log(
    `  ✓ normal finished in ${((Date.now() - t0) / 1000).toFixed(1)}s (P(insolvent): ${(normalSummary.probInsolvent * 100).toFixed(2)}%, P(denied_by_cap): ${(normalSummary.probDeniedByCap * 100).toFixed(2)}%)`,
  );

  console.log("  Running scenario: bad_year...");
  const t1 = Date.now();
  const badYearSummary = runSimulation(configs.bad_year, 2002);
  console.log(
    `  ✓ bad_year finished in ${((Date.now() - t1) / 1000).toFixed(1)}s (P(insolvent): ${(badYearSummary.probInsolvent * 100).toFixed(2)}%, P(denied_by_cap): ${(badYearSummary.probDeniedByCap * 100).toFixed(2)}%)`,
  );

  console.log("  Running scenario: exit_wave...");
  const t2 = Date.now();
  const exitWaveSummary = runSimulation(configs.exit_wave, 3003);
  console.log(
    `  ✓ exit_wave finished in ${((Date.now() - t2) / 1000).toFixed(1)}s (P(insolvent): ${(exitWaveSummary.probInsolvent * 100).toFixed(2)}%, P(denied_by_cap): ${(exitWaveSummary.probDeniedByCap * 100).toFixed(2)}%)`,
  );

  const summaries = [normalSummary, badYearSummary, exitWaveSummary];

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const docsDir = path.resolve(__dirname, "../docs/simulation");

  const csvPath = path.join(docsDir, "results.csv");
  const summaryPath = path.join(docsDir, "summary.md");
  const chartPath = path.join(docsDir, "chart.png");

  console.log(`[Simulator] Writing outputs to ${docsDir}...`);
  writeCsv(summaries, csvPath);
  console.log(`  ✓ Wrote ${csvPath}`);
  writeSummary(summaries, summaryPath);
  console.log(`  ✓ Wrote ${summaryPath}`);
  renderChart(summaries, chartPath);
  console.log(`  ✓ Wrote ${chartPath} and ${chartPath.replace(/\.png$/, ".svg")}`);

  const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Simulator] Completed all scenarios in ${totalSec}s.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const runsArg = process.argv[2] ? parseInt(process.argv[2], 10) : 10000;
  main(Number.isFinite(runsArg) && runsArg > 0 ? runsArg : 10000).catch((err) => {
    console.error("[Simulator] Fatal error:", err);
    process.exit(1);
  });
}
