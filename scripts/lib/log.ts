// Step logging with explorer links; exits non-zero on unexpected state (A-11.8).
export type LinkKind = "tx" | "account";

export const link = (
  kind: LinkKind,
  value: string,
  network: "testnet" | "mainnet" = "testnet",
): string => {
  const base = network === "mainnet" ? "https://nearblocks.io" : "https://testnet.nearblocks.io";
  const url = kind === "tx" ? `${base}/txns/${value}` : `${base}/address/${value}`;
  console.log(`  → ${kind}: ${url}`);
  return url;
};

export const step = (n: number, title: string): string => {
  const timestamp = new Date().toISOString();
  const message = `[${n}] ${title} (${timestamp})`;
  console.log(message);
  return message;
};

export const fail = (msg: string): never => {
  console.error(`✖ ${msg}`);
  process.exit(1);
};
