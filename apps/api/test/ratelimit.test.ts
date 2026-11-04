import test from "node:test";
import assert from "node:assert/strict";
import { RateLimiter } from "../src/relayer/ratelimit.js";

test("allow_blocks_after_limit", () => {
  const limiter = new RateLimiter(3, 10);
  const signer = "alice.testnet";

  // First 3 requests should pass
  assert.equal(limiter.allow(signer), true);
  assert.equal(limiter.allow(signer), true);
  assert.equal(limiter.allow(signer), true);

  // 4th request from same signer should be blocked
  assert.equal(limiter.allow(signer), false);

  // Another signer should still be allowed
  assert.equal(limiter.allow("bob.testnet"), true);
});
