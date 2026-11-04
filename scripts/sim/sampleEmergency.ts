// Per-member monthly emergency probability sampler (A-10.1).
import type { SeededRng } from "./rng.js";

export const sampleEmergency = (
  rng: SeededRng,
  monthlyProbability = 0.025,
): boolean => {
  return rng.next() < monthlyProbability;
};
