import test from "node:test";
import assert from "node:assert/strict";
import { CODE_ALPHABET, CODE_LENGTH, generateCode, codeHash } from "../src/code.js";

test("code_has_six_valid_chars", () => {
  for (let i = 0; i < 50; i++) {
    const code = generateCode();
    assert.equal(code.length, CODE_LENGTH);
    for (const char of code) {
      assert.ok(CODE_ALPHABET.includes(char), `Character ${char} should be in alphabet`);
    }
  }
});

test("code_hash_matches_rust_vector", async () => {
  // Test vector: sha256("ABCDEF" ‖ 1u64 LE)
  const code = "ABCDEF";
  const guaranteeId = 1;
  const hash = await codeHash(code, guaranteeId);

  assert.equal(hash.length, 32);
  const expectedVector = [
    255, 103, 117, 135, 213, 95, 89, 229,
    31, 72, 2, 185, 154, 192, 41, 178,
    96, 164, 244, 77, 44, 167, 213, 19,
    20, 194, 42, 22, 253, 94, 116, 166,
  ];
  assert.deepEqual(hash, expectedVector);
});
