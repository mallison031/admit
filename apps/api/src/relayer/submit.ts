// Wrap SignedDelegate in a transaction signed by the relayer function-call key and send (A-8.4).
export const submitDelegate = async (_signedDelegateB64: string): Promise<{ txHash: string }> => {
  throw new Error("not implemented: A-8.4");
};
