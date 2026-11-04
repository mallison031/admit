// Device keypair in IndexedDB. Never leaves the device; never sent to the server (A-9.2).
export const getOrCreateDeviceKey = async (): Promise<{ accountId: string; publicKey: string }> => {
  throw new Error("not implemented: A-9.2");
};
