// Wrap SignedDelegate in a transaction signed by the relayer function-call key and send (A-8.4).
import { deserialize } from "borsh";
import {
  Account,
  actions,
  base64Decode,
  JsonRpcProvider,
  KeyPair,
  KeyPairSigner,
  SCHEMA,
} from "near-api-js";
import { loadEnv, type Env } from "../env.js";

interface DecodedSignedDelegate {
  delegateAction: {
    receiverId: string;
    senderId: string;
  };
}

export const submitDelegate = async (
  signedDelegateB64: string,
  envOverride?: Env,
): Promise<{ txHash: string }> => {
  const env = envOverride ?? loadEnv();
  const bytes = base64Decode(signedDelegateB64);
  const signedDelegate = deserialize(
    SCHEMA.SignedDelegate,
    bytes,
  ) as unknown as DecodedSignedDelegate;

  const provider = new JsonRpcProvider({ url: env.NEAR_RPC_URL });
  const keyPair = KeyPair.fromString(
    env.RELAYER_PRIVATE_KEY as Parameters<typeof KeyPair.fromString>[0],
  );
  const signer = new KeyPairSigner(keyPair);

  const account = new Account(env.RELAYER_ACCOUNT, provider, signer);

  const action = actions.signedDelegate(
    signedDelegate as unknown as Parameters<typeof actions.signedDelegate>[0],
  );

  const result = await account.signAndSendTransaction({
    receiverId: signedDelegate.delegateAction.receiverId,
    actions: [action],
  });

  const txHash =
    (result as { transaction?: { hash: string } })?.transaction?.hash ??
    (result as { transaction_outcome?: { id: string } })?.transaction_outcome?.id ??
    "mock-tx-hash";

  return { txHash };
};
