import test from "node:test";
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { JsonRpcProvider } from "near-api-js";
import { createViewClient, calls } from "../src/contract.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const poolFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/pool.json"), "utf-8"),
);
const memberFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/member.json"), "utf-8"),
);
const guaranteeFixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/guarantee.json"), "utf-8"),
);

const poolStatsFixture = {
  pool_id: 0,
  balance: "10000000000",
  reserved: "2000000000",
  exposure_bps: 2000,
  written_off: "0",
  members: 10,
  issued: 5,
  settled: 3,
  defaults: 0,
};

const limitViewFixture = {
  limit: "50000000",
  council_tier_max: "150000000",
  standing: "Good",
  eligible: true,
  blocked_by: null,
};

const setMockRpc = (
  fn: (args: { contractId: string; method: string; args: Record<string, unknown> }) => Promise<unknown>,
) => {
  (
    JsonRpcProvider.prototype as unknown as {
      callFunction: (args: {
        contractId: string;
        method: string;
        args: Record<string, unknown>;
      }) => Promise<unknown>;
    }
  ).callFunction = fn;
};

test("get_pool_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "get_pool") {
        return poolFixture;
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const pool = await client.getPool(0);
    assert.ok(pool);
    assert.equal(pool.id, 0);
    assert.equal(pool.name, "Health Pool");
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("getPoolStats_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "get_pool_stats") {
        return poolStatsFixture;
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const stats = await client.getPoolStats(0);
    assert.equal(stats.pool_id, 0);
    assert.equal(stats.balance, "10000000000");
    assert.equal(stats.exposure_bps, 2000);
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("getMember_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "get_member") {
        return memberFixture;
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const member = await client.getMember(0, "alice.testnet");
    assert.ok(member);
    assert.equal(member.account, "alice.testnet");
    assert.equal(member.standing, "Good");
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("getLimit_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "get_limit") {
        return limitViewFixture;
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const limit = await client.getLimit(0, "alice.testnet");
    assert.equal(limit.limit, "50000000");
    assert.equal(limit.standing, "Good");
    assert.equal(limit.eligible, true);
    assert.equal(limit.blocked_by, null);
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("getGuarantee_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "get_guarantee") {
        return guaranteeFixture;
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const g = await client.getGuarantee(1);
    assert.ok(g);
    assert.equal(g.id, 1);
    assert.equal(g.status, "Issued");
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("listGuarantees_parses_response", async () => {
  const origCall = JsonRpcProvider.prototype.callFunction;
  try {
    setMockRpc(async (args) => {
      if (args.method === "list_guarantees") {
        return [guaranteeFixture];
      }
      throw new Error(`Unexpected call: ${args.method}`);
    });

    const client = createViewClient("http://mock-rpc", "admit.testnet");
    const list = await client.listGuarantees(0, 0, 10);
    assert.equal(list.length, 1);
    assert.equal(list[0]?.id, 1);
  } finally {
    JsonRpcProvider.prototype.callFunction = origCall;
  }
});

test("calls_guarantee_builders", () => {
  const codeHash = new Array(32).fill(1);
  const req = calls.requestGuarantee({
    pool_id: 0,
    member: "alice.testnet",
    hospital: "general-hospital.testnet",
    amount: "100000000",
    code_hash: codeHash,
  });
  assert.equal(req.methodName, "request_guarantee");
  assert.equal(req.args["pool_id"], 0);
  assert.equal(req.args["member"], "alice.testnet");
  assert.equal(req.args["amount"], "100000000");
  assert.deepEqual(req.args["code_hash"], codeHash);

  const topup = calls.requestTopup({ guarantee_id: 5, extra: "50000000" });
  assert.equal(topup.methodName, "request_topup");
  assert.equal(topup.args["guarantee_id"], 5);
  assert.equal(topup.args["extra"], "50000000");

  const approve = calls.councilApprove({ guarantee_id: 5 });
  assert.equal(approve.methodName, "council_approve");
  assert.equal(approve.args["guarantee_id"], 5);

  const reject = calls.councilReject({ guarantee_id: 5, reason: "Ineligible" });
  assert.equal(reject.methodName, "council_reject");
  assert.equal(reject.args["guarantee_id"], 5);
  assert.equal(reject.args["reason"], "Ineligible");

  const exp = calls.expire({ guarantee_id: 5 });
  assert.equal(exp.methodName, "expire");
  assert.equal(exp.args["guarantee_id"], 5);
});

test("calls_hospital_builders", () => {
  const accept = calls.hospitalAccept(12);
  assert.equal(accept.methodName, "hospital_accept");
  assert.equal(accept.args["guarantee_id"], 12);

  const fileHash = new Array(32).fill(2);
  const claim = calls.hospitalClaim(12, "80000000", fileHash);
  assert.equal(claim.methodName, "hospital_claim");
  assert.equal(claim.args["guarantee_id"], 12);
  assert.equal(claim.args["amount"], "80000000");
  assert.deepEqual(claim.args["file_hash"], fileHash);

  const release = calls.hospitalRelease({ guarantee_id: 12 });
  assert.equal(release.methodName, "hospital_release");
  assert.equal(release.args["guarantee_id"], 12);

  const transfer = calls.hospitalTransfer({
    guarantee_id: 12,
    to_hospital: "clinic.testnet",
    partial_amount: "20000000",
  });
  assert.equal(transfer.methodName, "hospital_transfer");
  assert.equal(transfer.args["guarantee_id"], 12);
  assert.equal(transfer.args["to_hospital"], "clinic.testnet");
  assert.equal(transfer.args["partial_amount"], "20000000");
});

test("calls_member_builders", () => {
  const join = calls.join({ pool_id: 0 });
  assert.equal(join.methodName, "join");
  assert.equal(join.args["pool_id"], 0);

  const addDel = calls.addDelegate({ pool_id: 0, delegate: "phone.testnet" });
  assert.equal(addDel.methodName, "add_delegate");
  assert.equal(addDel.args["delegate"], "phone.testnet");

  const remDel = calls.removeDelegate({ pool_id: 0, delegate: "phone.testnet" });
  assert.equal(remDel.methodName, "remove_delegate");
  assert.equal(remDel.args["delegate"], "phone.testnet");

  const reqExit = calls.requestExit({ pool_id: 0 });
  assert.equal(reqExit.methodName, "request_exit");

  const execExit = calls.executeExit({ pool_id: 0, member: "alice.testnet" });
  assert.equal(execExit.methodName, "execute_exit");
  assert.equal(execExit.args["member"], "alice.testnet");

  const dispute = calls.memberDispute({ guarantee_id: 3, reason: "Overcharged" });
  assert.equal(dispute.methodName, "member_dispute");
  assert.equal(dispute.args["guarantee_id"], 3);
  assert.equal(dispute.args["reason"], "Overcharged");
});

test("calls_council_builders", () => {
  const settle = calls.settle({
    guarantee_id: 3,
    adjustment: "10000000",
    reason: "Hospital discounted",
  });
  assert.equal(settle.methodName, "settle");
  assert.equal(settle.args["guarantee_id"], 3);
  assert.equal(settle.args["adjustment"], "10000000");

  const death = calls.reportDeath({ guarantee_id: 3 });
  assert.equal(death.methodName, "report_death");

  const setMembers = calls.councilSetMembers({
    pool_id: 0,
    council: ["c1.testnet", "c2.testnet"],
  });
  assert.equal(setMembers.methodName, "council_set_members");
  assert.deepEqual(setMembers.args["council"], ["c1.testnet", "c2.testnet"]);

  const addHosp = calls.councilAddHospital({
    pool_id: 0,
    hospital: {
      account: "general-hospital.testnet",
      name: "General Hospital",
      fc_public_key: "ed25519:123",
    },
  });
  assert.equal(addHosp.methodName, "council_add_hospital");

  const remHosp = calls.councilRemoveHospital({
    pool_id: 0,
    account: "general-hospital.testnet",
  });
  assert.equal(remHosp.methodName, "council_remove_hospital");

  const writeOff = calls.councilWriteOff({
    guarantee_id: 3,
    amount: "50000000",
    reason: "Uncollectible",
  });
  assert.equal(writeOff.methodName, "council_write_off");
  assert.equal(writeOff.args["amount"], "50000000");

  const markDef = calls.councilMarkDefault({
    pool_id: 0,
    member: "bob.testnet",
  });
  assert.equal(markDef.methodName, "council_mark_default");
  assert.equal(markDef.args["member"], "bob.testnet");
});
