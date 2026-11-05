// The ONLY place that knows contract method names and argument shapes (A-7.3).
// Views go through RPC; change calls are returned as action descriptions for wallets or delegate signing.
import { JsonRpcProvider } from "near-api-js";
import { z } from "zod";
import {
  type AiReview,
  Guarantee,
  type Hospital,
  LimitView,
  Member,
  Pool,
  type PoolParams,
  PoolStats,
} from "./types.js";

export interface ViewClient {
  getPool(poolId: number): Promise<Pool | null>;
  getPoolStats(poolId: number): Promise<PoolStats>;
  getMember(poolId: number, account: string): Promise<Member | null>;
  getLimit(poolId: number, account: string): Promise<LimitView>;
  getGuarantee(id: number): Promise<Guarantee | null>;
  listGuarantees(poolId: number, fromIndex?: number, limit?: number): Promise<Guarantee[]>;
  getAiReviewer(): Promise<string | null>;
}

export interface FunctionCall {
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}

const TGAS_30 = 30_000_000_000_000n;
const TGAS_50 = 50_000_000_000_000n;
const TGAS_100 = 100_000_000_000_000n;

export const createViewClient = (rpcUrl: string, contractId: string): ViewClient => {
  const provider = new JsonRpcProvider({ url: rpcUrl });

  const view = async (method: string, args: Record<string, unknown> = {}): Promise<unknown> => {
    return await provider.callFunction({
      contractId,
      method,
      args,
    });
  };

  return {
    async getPool(poolId: number): Promise<Pool | null> {
      const res = await view("get_pool", { pool_id: poolId });
      if (res === null || res === undefined) return null;
      return Pool.parse(res);
    },
    async getPoolStats(poolId: number): Promise<PoolStats> {
      const res = await view("get_pool_stats", { pool_id: poolId });
      return PoolStats.parse(res);
    },
    async getMember(poolId: number, account: string): Promise<Member | null> {
      const res = await view("get_member", { pool_id: poolId, account });
      if (res === null || res === undefined) return null;
      return Member.parse(res);
    },
    async getLimit(poolId: number, account: string): Promise<LimitView> {
      const res = await view("get_limit", { pool_id: poolId, account });
      return LimitView.parse(res);
    },
    async getGuarantee(id: number): Promise<Guarantee | null> {
      const res = await view("get_guarantee", { guarantee_id: id });
      if (res === null || res === undefined) return null;
      return Guarantee.parse(res);
    },
    async listGuarantees(poolId: number, fromIndex = 0, limit = 50): Promise<Guarantee[]> {
      const res = await view("list_guarantees", {
        pool_id: poolId,
        from_index: fromIndex,
        limit,
      });
      return z.array(Guarantee).parse(res);
    },
    async getAiReviewer(): Promise<string | null> {
      const res = await view("get_ai_reviewer");
      if (typeof res === "string") return res;
      return null;
    },
  };
};

// Change-call builders (A-7.3) — one per contract method in ARCHITECTURE §5.
export const calls = {
  // --- Guarantee methods (Issue #126) ---
  requestGuarantee: (a: {
    pool_id: number;
    member: string;
    hospital: string;
    amount: string;
    code_hash: number[];
    patient_initials?: string | null;
    local?: unknown | null;
  }): FunctionCall => ({
    methodName: "request_guarantee",
    args: {
      pool_id: a.pool_id,
      member: a.member,
      hospital: a.hospital,
      amount: a.amount,
      code_hash: a.code_hash,
      patient_initials: a.patient_initials ?? null,
      local: a.local ?? null,
    },
    gas: TGAS_30,
    deposit: 0n,
  }),

  requestTopup: (a: { guarantee_id: number; extra: string }): FunctionCall => ({
    methodName: "request_topup",
    args: { guarantee_id: a.guarantee_id, extra: a.extra },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilApprove: (a: { guarantee_id: number }): FunctionCall => ({
    methodName: "council_approve",
    args: { guarantee_id: a.guarantee_id },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilReject: (a: { guarantee_id: number; reason: string }): FunctionCall => ({
    methodName: "council_reject",
    args: { guarantee_id: a.guarantee_id, reason: a.reason },
    gas: TGAS_30,
    deposit: 0n,
  }),

  expire: (a: { guarantee_id: number }): FunctionCall => ({
    methodName: "expire",
    args: { guarantee_id: a.guarantee_id },
    gas: TGAS_30,
    deposit: 0n,
  }),

  // --- Hospital methods (Issue #127) ---
  hospitalAccept: (opts: number | { guarantee_id: number }): FunctionCall => {
    const guaranteeId = typeof opts === "number" ? opts : opts.guarantee_id;
    return {
      methodName: "hospital_accept",
      args: { guarantee_id: guaranteeId },
      gas: TGAS_30,
      deposit: 0n,
    };
  },

  hospitalClaim: (
    idOrOpts:
      | number
      | { guarantee_id: number; amount: string; file_hash?: number[]; fileHash?: number[] },
    amount?: string,
    fileHash?: number[],
  ): FunctionCall => {
    if (typeof idOrOpts === "number") {
      return {
        methodName: "hospital_claim",
        args: {
          guarantee_id: idOrOpts,
          amount: amount!,
          file_hash: fileHash!,
        },
        gas: TGAS_50,
        deposit: 0n,
      };
    }
    return {
      methodName: "hospital_claim",
      args: {
        guarantee_id: idOrOpts.guarantee_id,
        amount: idOrOpts.amount,
        file_hash: idOrOpts.file_hash ?? idOrOpts.fileHash ?? [],
      },
      gas: TGAS_50,
      deposit: 0n,
    };
  },

  hospitalRelease: (a: { guarantee_id: number }): FunctionCall => ({
    methodName: "hospital_release",
    args: { guarantee_id: a.guarantee_id },
    gas: TGAS_30,
    deposit: 0n,
  }),

  hospitalTransfer: (a: {
    guarantee_id: number;
    to_hospital: string;
    partial_amount?: string | null;
  }): FunctionCall => ({
    methodName: "hospital_transfer",
    args: {
      guarantee_id: a.guarantee_id,
      to_hospital: a.to_hospital,
      partial_amount: a.partial_amount ?? null,
    },
    gas: TGAS_50,
    deposit: 0n,
  }),

  // --- Member methods (Issue #128) ---
  join: (a: { pool_id: number }): FunctionCall => ({
    methodName: "join",
    args: { pool_id: a.pool_id },
    gas: TGAS_30,
    deposit: 0n,
  }),

  addDelegate: (a: { pool_id: number; delegate: string }): FunctionCall => ({
    methodName: "add_delegate",
    args: { pool_id: a.pool_id, delegate: a.delegate },
    gas: TGAS_30,
    deposit: 0n,
  }),

  removeDelegate: (a: { pool_id: number; delegate: string }): FunctionCall => ({
    methodName: "remove_delegate",
    args: { pool_id: a.pool_id, delegate: a.delegate },
    gas: TGAS_30,
    deposit: 0n,
  }),

  requestExit: (a: { pool_id: number }): FunctionCall => ({
    methodName: "request_exit",
    args: { pool_id: a.pool_id },
    gas: TGAS_30,
    deposit: 0n,
  }),

  executeExit: (a: { pool_id: number; member: string }): FunctionCall => ({
    methodName: "execute_exit",
    args: { pool_id: a.pool_id, member: a.member },
    gas: TGAS_100,
    deposit: 0n,
  }),

  memberDispute: (a: { guarantee_id: number; reason: string }): FunctionCall => ({
    methodName: "member_dispute",
    args: { guarantee_id: a.guarantee_id, reason: a.reason },
    gas: TGAS_30,
    deposit: 0n,
  }),

  // --- Council methods (Issue #129) ---
  settle: (a: { guarantee_id: number; adjustment?: string; reason?: string | null }): FunctionCall => ({
    methodName: "settle",
    args: {
      guarantee_id: a.guarantee_id,
      adjustment: a.adjustment ?? "0",
      reason: a.reason ?? null,
    },
    gas: TGAS_100,
    deposit: 0n,
  }),

  reportDeath: (a: { guarantee_id: number }): FunctionCall => ({
    methodName: "report_death",
    args: { guarantee_id: a.guarantee_id },
    gas: TGAS_100,
    deposit: 0n,
  }),

  councilSetMembers: (a: { pool_id: number; council: string[] }): FunctionCall => ({
    methodName: "council_set_members",
    args: { pool_id: a.pool_id, council: a.council },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilAddHospital: (a: {
    pool_id: number;
    hospital: Hospital;
    deposit?: bigint;
  }): FunctionCall => ({
    methodName: "council_add_hospital",
    args: { pool_id: a.pool_id, hospital: a.hospital },
    gas: TGAS_100,
    deposit: a.deposit ?? 12_500_000_000_000_000_000_000n, // 0.0125 NEAR storage deposit
  }),

  councilRemoveHospital: (a: { pool_id: number; account: string }): FunctionCall => ({
    methodName: "council_remove_hospital",
    args: { pool_id: a.pool_id, account: a.account },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilSetParams: (a: { pool_id: number; params: PoolParams }): FunctionCall => ({
    methodName: "council_set_params",
    args: { pool_id: a.pool_id, params: a.params },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilWriteOff: (a: { guarantee_id: number; amount: string; reason: string }): FunctionCall => ({
    methodName: "council_write_off",
    args: { guarantee_id: a.guarantee_id, amount: a.amount, reason: a.reason },
    gas: TGAS_30,
    deposit: 0n,
  }),

  councilMarkDefault: (a: { pool_id: number; member: string }): FunctionCall => ({
    methodName: "council_mark_default",
    args: { pool_id: a.pool_id, member: a.member },
    gas: TGAS_30,
    deposit: 0n,
  }),

  // --- AI review methods (Issue #185 / A-12.1) ---
  postAiReview: (a: { guarantee_id: number; review: AiReview }): FunctionCall => ({
    methodName: "post_ai_review",
    args: { guarantee_id: a.guarantee_id, review: a.review },
    gas: TGAS_30,
    deposit: 0n,
  }),
};
