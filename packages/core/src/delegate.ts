// Build + sign NEP-366 delegate actions with a device key (A-7.5). Approach decided in A-0.6.
import type { FunctionCall } from "./contract.js";

export interface SignedDelegatePayload {
  /** base64 borsh-encoded SignedDelegate */
  signedDelegate: string;
}

export const signDelegate = async (_opts: {
  senderId: string;
  receiverId: string;
  call: FunctionCall;
  privateKey: string;
  rpcUrl: string;
}): Promise<SignedDelegatePayload> => {
  throw new Error("not implemented: A-7.5");
};
