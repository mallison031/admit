import test from "node:test";
import assert from "node:assert/strict";
import { formatAmount, parseAmount } from "../src/format.js";

test("formatAmount_cases", () => {
  // 1,234.56 tUSDC with 6 decimals
  assert.equal(formatAmount(1234560000n, 6, "tUSDC"), "1,234.56 tUSDC");

  // Zero decimals
  assert.equal(formatAmount(500n, 0, "NEAR"), "500 NEAR");

  // Zero amount
  assert.equal(formatAmount(0n, 6, "tUSDC"), "0 tUSDC");

  // Whole amount with no fractional part
  assert.equal(formatAmount(1000000n, 6, "tUSDC"), "1 tUSDC");

  // Small fractional amount
  assert.equal(formatAmount(50000n, 6, "tUSDC"), "0.05 tUSDC");

  // No symbol provided
  assert.equal(formatAmount(1234560000n, 6), "1,234.56");

  // Negative amount
  assert.equal(formatAmount(-5000000n, 6, "tUSDC"), "-5 tUSDC");
});

test("parseAmount_cases", () => {
  // Standard parsing with commas and decimals
  assert.equal(parseAmount("1,234.56", 6), 1234560000n);

  // Integer only
  assert.equal(parseAmount("100", 6), 100000000n);

  // Fractional only
  assert.equal(parseAmount(".5", 6), 500000n);
  assert.equal(parseAmount("0.05", 6), 50000n);

  // Negative
  assert.equal(parseAmount("-5", 6), -5000000n);

  // Zero decimals
  assert.equal(parseAmount("42", 0), 42n);

  // Errors on exceeding decimals
  assert.throws(() => parseAmount("1.1234567", 6), /exceeds 6 decimals/);

  // Errors on invalid strings
  assert.throws(() => parseAmount("abc", 6), /Invalid amount format/);
  assert.throws(() => parseAmount("", 6), /Cannot parse empty amount/);
  assert.throws(() => parseAmount("1.2.3", 6), /Invalid amount format/);
});
