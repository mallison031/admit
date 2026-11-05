import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  type AttestationReport,
  computeReportData,
  computeReportHash,
  verifyAttestation,
} from "../verify-attestation.js";

const fixturePath = fileURLToPath(new URL("../../fixtures/attestation.json", import.meta.url));
const validFixture = JSON.parse(readFileSync(fixturePath, "utf-8")) as AttestationReport;

test("verifyAttestation succeeds on valid report", () => {
  const result = verifyAttestation(validFixture);
  assert.equal(result.valid, true);
  assert.equal(result.signing_address, "0x4b20993Bc481177ec7E8f571ceCaE8A9e22C02db");
  assert.equal(result.nonce_verified, true);
  assert.equal(result.binding_verified, true);
  assert.equal(result.report_hash.length, 64);
});

test("verifyAttestation validates matching expectedNonce", () => {
  const result = verifyAttestation(validFixture, validFixture.nonce);
  assert.equal(result.valid, true);
  assert.equal(result.nonce_verified, true);
});

test("verifyAttestation rejects replay with mismatched nonce", () => {
  const result = verifyAttestation(validFixture, "different-stale-nonce-12345");
  assert.equal(result.valid, false);
  assert.equal(result.nonce_verified, false);
  assert.match(result.error ?? "", /Nonce mismatch/);
});

test("verifyAttestation rejects tampered report_data", () => {
  const tampered: AttestationReport = JSON.parse(JSON.stringify(validFixture));
  tampered.quote.body.report_data = "a".repeat(128);

  const result = verifyAttestation(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.binding_verified, false);
  assert.match(result.error ?? "", /report_data does not bind/);
});

test("verifyAttestation rejects spoofed signing address", () => {
  const tampered: AttestationReport = JSON.parse(JSON.stringify(validFixture));
  tampered.signing_address = "0x0000000000000000000000000000000000000000";

  const result = verifyAttestation(tampered);
  assert.equal(result.valid, false);
  assert.equal(result.binding_verified, false);
});

test("computeReportData returns 128-char hex string", () => {
  const data = computeReportData("test-nonce", "0x1234");
  assert.equal(data.length, 128);
});

test("computeReportHash changes if report payload changes", () => {
  const hash1 = computeReportHash(validFixture);
  const copy = { ...validFixture, timestamp: 999999999 };
  const hash2 = computeReportHash(copy);
  assert.notEqual(hash1, hash2);
});
