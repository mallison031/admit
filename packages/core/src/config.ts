// Network config + explorer URL builders (A-7.6).
export type Network = "testnet" | "mainnet";

export interface AdmitConfig {
  network: Network;
  rpcUrl: string;
  contractId: string;
  tokenDecimals: number;
}

export const explorerTxUrl = (network: Network, txHash: string): string => {
  const base = network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";
  return `${base}/txns/${txHash}`;
};

export const explorerAccountUrl = (network: Network, accountId: string): string => {
  const base = network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";
  return `${base}/address/${accountId}`;
};
