// Seeded deterministic pseudo-random number generator for reproducible Monte Carlo simulation.
export class SeededRng {
  private s: number;

  constructor(seed = 123456789) {
    this.s = seed >>> 0;
  }

  /** Returns uniform float in [0, 1) */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns standard normal variable N(mean, stdDev) via Box-Muller transform */
  nextNormal(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-15, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}
