import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, Member, Guarantee } from "../src/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("types_parses_sample_view_json", () => {
  const poolJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures/pool.json"), "utf-8"),
  );
  const parsedPool = Pool.parse(poolJson);
  assert.equal(parsedPool.id, 0);
  assert.equal(parsedPool.name, "Health Pool");
  assert.equal(parsedPool.params.time_scale, 1);

  const memberJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures/member.json"), "utf-8"),
  );
  const parsedMember = Member.parse(memberJson);
  assert.equal(parsedMember.account, "alice.testnet");
  assert.equal(parsedMember.standing, "Good");

  const guaranteeJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "fixtures/guarantee.json"), "utf-8"),
  );
  const parsedGuarantee = Guarantee.parse(guaranteeJson);
  assert.equal(parsedGuarantee.id, 1);
  assert.equal(parsedGuarantee.status, "Issued");
  assert.equal(parsedGuarantee.code_hash.length, 32);
});
