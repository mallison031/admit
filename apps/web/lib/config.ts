import { createViewClient, type ViewClient } from "@admit/core";

export const getNetwork = (): "testnet" | "mainnet" => {
  return (
    (process.env.NEXT_PUBLIC_NEAR_NETWORK as "testnet" | "mainnet") ||
    (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") ||
    "testnet"
  );
};

export const getContractId = (): string => {
  return (
    process.env.NEXT_PUBLIC_ADMIT_CONTRACT ||
    process.env.NEXT_PUBLIC_CONTRACT_ID ||
    "pool.admit-hack-6711fd.testnet"
  );
};

export const getRpcUrl = (): string => {
  if (process.env.NEXT_PUBLIC_NEAR_RPC_URL) {
    return process.env.NEXT_PUBLIC_NEAR_RPC_URL;
  }
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    return process.env.NEXT_PUBLIC_RPC_URL;
  }
  return getNetwork() === "mainnet"
    ? "https://rpc.mainnet.near.org"
    : "https://near-testnet.drpc.org";
};

export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
};

let cachedViewClient: ViewClient | null = null;

export const getViewClient = (): ViewClient => {
  if (!cachedViewClient) {
    cachedViewClient = createViewClient(getRpcUrl(), getContractId());
  }
  return cachedViewClient;
};
