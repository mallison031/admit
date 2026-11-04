// Lognormal bill size calibrated to ARCHITECTURE §4 (A-0.7 figures: $38–$376).
import type { SeededRng } from "./rng.js";

export const sampleBill = (
  rng: SeededRng,
  opts: { meanLog?: number; stdDevLog?: number; min?: number; max?: number } = {},
): bigint => {
  // Default mu = ln(100) ~ 4.6052, sigma = 0.55
  // Yields median $100, 5th percentile ~$40, 95th percentile ~$250, 99th percentile ~$365
  const mu = opts.meanLog ?? 4.6052;
  const sigma = opts.stdDevLog ?? 0.55;
  const min = opts.min ?? 30;
  const max = opts.max ?? 450;

  const normal = rng.nextNormal(mu, sigma);
  const rawUsd = Math.exp(normal);
  const clampedUsd = Math.max(min, Math.min(max, Math.round(rawUsd)));

  // Return amount in 6 decimal places (tUSDC)
  return BigInt(clampedUsd) * 1_000_000n;
};
