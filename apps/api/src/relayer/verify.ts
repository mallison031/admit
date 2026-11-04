// Verify receiver == ADMIT_CONTRACT and every action's method ∈ allow-list (A-8.2).
export interface VerifyResult { ok: boolean; reason?: string }

export const verifyDelegate = (_signedDelegateB64: string, _contractId: string): VerifyResult => {
  throw new Error("not implemented: A-8.2");
};
