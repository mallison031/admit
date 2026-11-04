// Token buckets: per signer + global (A-8.3). Keyed by signer account, never by IP.
interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private perSignerLimit: number;
  private globalLimit: number;
  private signerBuckets = new Map<string, Bucket>();
  private globalBucket: Bucket;

  constructor(perSignerLimit = 20, globalLimit = 100) {
    this.perSignerLimit = perSignerLimit;
    this.globalLimit = globalLimit;
    this.globalBucket = { tokens: globalLimit, lastRefill: Date.now() };
  }

  allow(signer: string, now = Date.now()): boolean {
    this.refill(this.globalBucket, this.globalLimit, now);
    if (this.globalBucket.tokens < 1) {
      return false;
    }

    let signerBucket = this.signerBuckets.get(signer);
    if (!signerBucket) {
      signerBucket = { tokens: this.perSignerLimit, lastRefill: now };
      this.signerBuckets.set(signer, signerBucket);
    } else {
      this.refill(signerBucket, this.perSignerLimit, now);
    }

    if (signerBucket.tokens < 1) {
      return false;
    }

    this.globalBucket.tokens -= 1;
    signerBucket.tokens -= 1;
    return true;
  }

  private refill(bucket: Bucket, maxTokens: number, now: number) {
    const elapsed = Math.max(0, now - bucket.lastRefill);
    const refillTokens = (elapsed / 60_000) * maxTokens;
    if (refillTokens > 0) {
      bucket.tokens = Math.min(maxTokens, bucket.tokens + refillTokens);
      bucket.lastRefill = now;
    }
  }

  reset() {
    this.signerBuckets.clear();
    this.globalBucket = { tokens: this.globalLimit, lastRefill: Date.now() };
  }
}

export const defaultLimiter = new RateLimiter();

export const allow = (signer: string): boolean => {
  return defaultLimiter.allow(signer);
};
