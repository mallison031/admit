// Network config + explorer URL builders (A-7.6).
export type Network = "testnet" | "mainnet";

export interface AdmitConfig {
  network: Network;
  rpcUrl: string;
  contractId: string;
  tokenDecimals: number;
}

export const explorerTxUrl = (_network: Network, _txHash: string): string => {
  throw new Error("not implemented: A-7.6");
};
export const explorerAccountUrl = (_network: Network, _accountId: string): string => {
  throw new Error("not implemented: A-7.6");
};
