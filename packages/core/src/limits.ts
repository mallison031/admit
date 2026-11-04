// Mirror of contracts/admit-pool/src/limits.rs (A-7.2). PURE. Change both together.
import type { Member, Pool, PoolParams, Standing, Tier } from "./types.js";

const todo = (task: string): never => {
  throw new Error(`not implemented: ${task}`);
};

export const tenureMonths = (_m: Member, _p: PoolParams, _nowNs: bigint): bigint => todo("A-7.2");
export const goodMonths = (_m: Member, _p: PoolParams, _nowNs: bigint): bigint => todo("A-7.2");
export const rawLimit = (_p: PoolParams, _goodMonths: bigint): bigint => todo("A-7.2");
export const limit = (_m: Member, _p: PoolParams, _reservedForMember: bigint, _nowNs: bigint): bigint =>
  todo("A-7.2");
export const exposureOk = (_pool: Pool, _amount: bigint): boolean => todo("A-7.2");
export const tier = (_amount: bigint, _limit: bigint, _p: PoolParams): Tier => todo("A-7.2");
export const deriveStanding = (_m: Member, _p: PoolParams, _nowNs: bigint): Standing => todo("A-7.2");
