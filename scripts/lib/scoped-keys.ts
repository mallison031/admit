// Scoped function-call key helpers for hospitals and delegates (A-6.4).
import { Account, actions, JsonRpcProvider, KeyPair, KeyPairSigner, PublicKey } from "near-api-js";
import { getKeyPair, type AccountsConfig } from "./accounts.js";

export const HOSPITAL_METHODS = [
  "hospital_accept",
  "hospital_claim",
  "hospital_release",
  "hospital_transfer",
] as const;

export const DELEGATE_METHODS = [
  "request_guarantee",
  "request_topup",
  "member_dispute",
] as const;

export const RELAYED_METHODS = [...HOSPITAL_METHODS, ...DELEGATE_METHODS] as const;
export type RelayedMethod = (typeof RELAYED_METHODS)[number];

export interface ScopedKeyResult {
  accountId: string;
  publicKey: string;
  privateKey?: string;
  receiverId: string;
  methodNames: readonly string[];
}

export const createScopedKeyPair = (): { publicKey: string; privateKey: string } => {
  const kp = KeyPair.fromRandom("ed25519");
  return {
    publicKey: kp.getPublicKey().toString(),
    privateKey: kp.toString(),
  };
};

export const addScopedKey = async (opts: {
  accountId: string;
  receiverId: string;
  methodNames: readonly string[];
  publicKey: string;
  cfg?: AccountsConfig;
  allowance?: bigint;
}): Promise<ScopedKeyResult> => {
  const provider = new JsonRpcProvider({ url: opts.cfg?.NEAR_RPC_URL ?? "https://rpc.testnet.near.org" });
  const keyPair = getKeyPair(opts.accountId, opts.cfg);
  const signer = new KeyPairSigner(keyPair);
  const account = new Account(opts.accountId, provider, signer);

  const pk = PublicKey.fromString(opts.publicKey);
  const allowance = opts.allowance ?? 250_000_000_000_000_000_000_000n; // 0.25 NEAR allowance

  await account.signAndSendTransaction({
    receiverId: opts.accountId,
    actions: [
      actions.addFunctionCallAccessKey(
        pk,
        opts.receiverId,
        [...opts.methodNames],
        allowance,
      ),
    ],
  });

  return {
    accountId: opts.accountId,
    publicKey: opts.publicKey,
    receiverId: opts.receiverId,
    methodNames: opts.methodNames,
  };
};

export const verifyScopedKey = async (opts: {
  accountId: string;
  publicKey: string;
  provider: JsonRpcProvider;
}): Promise<{
  isValid: boolean;
  receiverId?: string;
  methodNames?: string[];
  allowance?: string | null;
}> => {
  const res = (await opts.provider.query({
    request_type: "view_access_key_list",
    finality: "final",
    account_id: opts.accountId,
  })) as {
    keys: Array<{
      public_key: string;
      access_key: {
        permission:
          | "FullAccess"
          | {
              FunctionCall: {
                receiver_id: string;
                method_names: string[];
                allowance: string | null;
              };
            };
      };
    }>;
  };

  const match = res.keys.find((k) => k.public_key === opts.publicKey);
  if (!match) return { isValid: false };

  if (typeof match.access_key.permission === "object" && "FunctionCall" in match.access_key.permission) {
    const fc = match.access_key.permission.FunctionCall;
    return {
      isValid: true,
      receiverId: fc.receiver_id,
      methodNames: fc.method_names,
      allowance: fc.allowance,
    };
  }

  return { isValid: false };
};
