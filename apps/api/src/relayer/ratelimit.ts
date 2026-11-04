// Token buckets: per signer + global (A-8.3). Keyed by signer account, never by IP.
export const allow = (_signer: string): boolean => {
  throw new Error("not implemented: A-8.3");
};
