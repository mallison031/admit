import { createViewClient, type ViewClient } from "@admit/core";

export const getNetwork = (): "testnet" | "mainnet" => {
  return (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet";
};

export const getContractId = (): string => {
  return process.env.NEXT_PUBLIC_CONTRACT_ID || "admit-pool.testnet";
};

export const getRpcUrl = (): string => {
  if (process.env.NEXT_PUBLIC_RPC_URL) {
    return process.env.NEXT_PUBLIC_RPC_URL;
  }
  return getNetwork() === "mainnet"
    ? "https://rpc.mainnet.near.org"
    : "https://rpc.testnet.near.org";
};

export const getApiUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
};

let cachedViewClient: ViewClient | null = null;

export const getViewClient = (): ViewClient => {
  if (!cachedViewClient) {
    cachedViewClient = createViewClient(getRpcUrl(), getContractId());
  }
  return cachedViewClient;
};
