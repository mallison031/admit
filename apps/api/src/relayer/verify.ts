// Verify receiver == ADMIT_CONTRACT and every action's method ∈ allow-list (A-8.2).
import { deserialize } from "borsh";
import { base64Decode, SCHEMA } from "near-api-js";
import { isRelayedMethod } from "./allowlist.js";

export interface VerifyResult {
  ok: boolean;
  reason?: string;
  senderId?: string;
}

interface DecodedSignedDelegate {
  delegateAction: {
    senderId: string;
    receiverId: string;
    actions: Array<{
      functionCall?: {
        methodName: string;
      };
      enum?: string;
    }>;
  };
}

export const verifyDelegate = (
  signedDelegateB64: string,
  contractId: string,
): VerifyResult => {
  try {
    const bytes = base64Decode(signedDelegateB64);
    if (!bytes || bytes.length === 0) {
      return { ok: false, reason: "empty payload" };
    }

    const decoded = deserialize(
      SCHEMA.SignedDelegate,
      bytes,
    ) as unknown as DecodedSignedDelegate;

    const { delegateAction } = decoded;
    if (!delegateAction) {
      return { ok: false, reason: "missing delegateAction" };
    }

    if (delegateAction.receiverId !== contractId) {
      return { ok: false, reason: "invalid receiver" };
    }

    const { actions } = delegateAction;
    if (!actions || actions.length === 0) {
      return { ok: false, reason: "no actions in delegate" };
    }

    for (const action of actions) {
      const methodName = action.functionCall?.methodName;
      if (!methodName || !isRelayedMethod(methodName)) {
        return { ok: false, reason: `method not allowed: ${methodName ?? "unknown"}` };
      }
    }

    return { ok: true, senderId: delegateAction.senderId };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `failed to decode delegate: ${msg}` };
  }
};
