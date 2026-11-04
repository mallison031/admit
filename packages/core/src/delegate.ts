// Build + sign NEP-366 delegate actions with a device key (A-7.5). Approach decided in A-0.6.
import {
  actions,
  base64Encode,
  buildDelegateAction,
  encodeSignedDelegate,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
} from "near-api-js";
import type { FunctionCall } from "./contract.js";

export interface SignedDelegatePayload {
  /** base64 borsh-encoded SignedDelegate */
  signedDelegate: string;
}

export const signDelegate = async (opts: {
  senderId: string;
  receiverId: string;
  call: FunctionCall;
  privateKey: string;
  rpcUrl?: string;
  nonce?: bigint;
  maxBlockHeight?: bigint;
  blockHeightTtl?: number;
}): Promise<SignedDelegatePayload> => {
  const keyPair = KeyPair.fromString(opts.privateKey as Parameters<typeof KeyPair.fromString>[0]);
  const signer = new KeyPairSigner(keyPair);
  const pk = await signer.getPublicKey();

  let nonce: bigint;
  let maxBlockHeight: bigint;

  if (opts.nonce !== undefined && opts.maxBlockHeight !== undefined) {
    nonce = opts.nonce;
    maxBlockHeight = opts.maxBlockHeight;
  } else {
    if (!opts.rpcUrl) {
      throw new Error("rpcUrl is required when nonce and maxBlockHeight are not provided");
    }
    const provider = new JsonRpcProvider({ url: opts.rpcUrl });
    const [accessKey, block] = await Promise.all([
      provider.viewAccessKey({ accountId: opts.senderId, publicKey: pk }),
      provider.viewBlock({ finality: "final" }),
    ]);
    nonce = BigInt(accessKey.nonce) + 1n;
    const ttl = BigInt(opts.blockHeightTtl ?? 200);
    maxBlockHeight = BigInt(block.header.height) + ttl;
  }

  const action = actions.functionCall(
    opts.call.methodName,
    opts.call.args,
    opts.call.gas,
    opts.call.deposit,
  );

  const delegateAction = buildDelegateAction({
    actions: [action],
    maxBlockHeight,
    nonce,
    publicKey: pk,
    receiverId: opts.receiverId,
    senderId: opts.senderId,
  });

  const signed = await signer.signDelegateAction(delegateAction);
  const encoded = encodeSignedDelegate(signed.signedDelegate);
  const base64 = base64Encode(encoded);

  return { signedDelegate: base64 };
};
