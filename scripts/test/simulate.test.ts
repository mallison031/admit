import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { renderChart } from "../sim/renderChart.js";
import { SeededRng } from "../sim/rng.js";
import { sampleBill } from "../sim/sampleBill.js";
import { sampleEmergency } from "../sim/sampleEmergency.js";
import { getScenarioConfigs, runSimulation } from "../sim/scenarios.js";
import { writeCsv } from "../sim/writeCsv.js";
import { writeSummary } from "../sim/writeSummary.js";

test("SeededRng generates deterministic sequences", () => {
  const rng1 = new SeededRng(12345);
  const seq1 = [rng1.next(), rng1.next(), rng1.next()];

  const rng2 = new SeededRng(12345);
  const seq2 = [rng2.next(), rng2.next(), rng2.next()];

  assert.deepEqual(seq1, seq2);
  assert.ok(seq1.every((n) => n >= 0 && n < 1));
});

test("sampleBill generates lognormal bills within reasonable emergency bounds", () => {
  const rng = new SeededRng(42);
  const bills: bigint[] = [];
  for (let i = 0; i < 500; i++) {
    bills.push(sampleBill(rng, { meanLog: 4.6052, stdDevLog: 0.55 }));
  }

  // Convert to USD numbers
  const usdValues = bills.map((b) => Number(b) / 1_000_000).sort((a, b) => a - b);
  const median = usdValues[Math.floor(usdValues.length / 2)]!;

  // Median should be close to exp(4.6052) ≈ 100
  assert.ok(median >= 80 && median <= 125, `Expected median ~100, got ${median}`);
  assert.ok(usdValues[0]! >= 20, `Minimum bill too low: ${usdValues[0]}`);
  assert.ok(usdValues[usdValues.length - 1]! <= 1000, `Maximum bill too high: ${usdValues[usdValues.length - 1]}`);
});

test("sampleEmergency respects target monthly probability", () => {
  const rng = new SeededRng(99);
  let trueCount = 0;
  const n = 10000;
  for (let i = 0; i < n; i++) {
    if (sampleEmergency(rng, 0.025)) {
      trueCount++;
    }
  }
  const observedProb = trueCount / n;
  assert.ok(
    observedProb >= 0.020 && observedProb <= 0.030,
    `Observed prob ${observedProb} outside [0.020, 0.030]`,
  );
});

test("runSimulation produces consistent results for configured scenarios", () => {
  const configs = getScenarioConfigs(100); // 100 runs for quick unit test
  const summary = runSimulation(configs.normal, 777);

  assert.equal(summary.scenario, "normal");
  assert.equal(summary.runs, 100);
  assert.equal(summary.months, 24);
  assert.ok(summary.probInsolvent >= 0 && summary.probInsolvent <= 0.05);
  assert.ok(summary.meanFinalBalanceUsd > 0);
  assert.equal(summary.averageMonthlyBalanceUsd.length, 24);
});

test("writeCsv and writeSummary write expected content", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admit-sim-test-"));
  const csvPath = path.join(tmpDir, "results.csv");
  const summaryPath = path.join(tmpDir, "summary.md");

  const configs = getScenarioConfigs(50);
  const normalSummary = runSimulation(configs.normal, 1);
  const summaries = [normalSummary];

  writeCsv(summaries, csvPath);
  assert.ok(fs.existsSync(csvPath));
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  assert.ok(csvContent.includes("# Scenario Solvency Summary"));
  assert.ok(csvContent.includes("normal,50,24"));

  writeSummary(summaries, summaryPath);
  assert.ok(fs.existsSync(summaryPath));
  const mdContent = fs.readFileSync(summaryPath, "utf-8");
  assert.ok(mdContent.includes("# Admit Solvency Simulation Report"));
  assert.ok(mdContent.includes("P(Insolvent)"));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});

test("renderChart creates valid PNG and SVG", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admit-sim-chart-test-"));
  const pngPath = path.join(tmpDir, "chart.png");

  const configs = getScenarioConfigs(20);
  const summaries = [
    runSimulation(configs.normal, 1),
    runSimulation(configs.bad_year, 2),
  ];

  renderChart(summaries, pngPath);

  assert.ok(fs.existsSync(pngPath));
  const pngBuf = fs.readFileSync(pngPath);
  // PNG Magic bytes: 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A
  assert.equal(pngBuf[0], 0x89);
  assert.equal(pngBuf[1], 0x50);
  assert.equal(pngBuf[2], 0x4e);
  assert.equal(pngBuf[3], 0x47);

  const svgPath = path.join(tmpDir, "chart.svg");
  assert.ok(fs.existsSync(svgPath));
  const svgContent = fs.readFileSync(svgPath, "utf-8");
  assert.ok(svgContent.includes("<svg"));
  assert.ok(svgContent.includes("Admit Pool Solvency Trajectory"));

  fs.rmSync(tmpDir, { recursive: true, force: true });
});
