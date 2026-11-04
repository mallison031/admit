// The ONLY place that knows contract method names and argument shapes (A-7.3).
// Views go through RPC; change calls are returned as action descriptions for wallets or delegate signing.
import type { Guarantee, LimitView, Member, Pool, PoolStats } from "./types.js";

export interface ViewClient {
  getPool(poolId: number): Promise<Pool | null>;
  getPoolStats(poolId: number): Promise<PoolStats>;
  getMember(poolId: number, account: string): Promise<Member | null>;
  getLimit(poolId: number, account: string): Promise<LimitView>;
  getGuarantee(id: number): Promise<Guarantee | null>;
  listGuarantees(poolId: number, fromIndex?: number, limit?: number): Promise<Guarantee[]>;
}

export interface FunctionCall {
  methodName: string;
  args: Record<string, unknown>;
  gas: bigint;
  deposit: bigint;
}

export const createViewClient = (_rpcUrl: string, _contractId: string): ViewClient => {
  throw new Error("not implemented: A-7.3");
};

// Change-call builders (A-7.3) — one per contract method in ARCHITECTURE §5.
export const calls = {
  requestGuarantee: (_a: {
    pool_id: number; member: string; hospital: string; amount: string;
    code_hash: number[]; patient_initials: string | null; local: unknown | null;
  }): FunctionCall => { throw new Error("not implemented: A-7.3"); },
  hospitalAccept: (_id: number): FunctionCall => { throw new Error("not implemented: A-7.3"); },
  hospitalClaim: (_id: number, _amount: string, _fileHash: number[]): FunctionCall => {
    throw new Error("not implemented: A-7.3");
  },
  // TODO(A-7.3): remaining methods
};
