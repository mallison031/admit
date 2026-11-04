import { describe, expect, it } from "vitest";
import { clearDeviceKey, getOrCreateDeviceKey } from "../lib/device-key";

describe("device-key", () => {
  it("generates an Ed25519 keypair with 64-char implicit accountId", async () => {
    clearDeviceKey();
    const key = await getOrCreateDeviceKey();

    expect(key).toBeDefined();
    expect(key.publicKey).toMatch(/^ed25519:/);
    expect(key.privateKey).toMatch(/^ed25519:/);
    expect(key.accountId).toHaveLength(64);
    expect(key.accountId).toMatch(/^[0-9a-f]{64}$/);
  });

  it("persists device key across repeated calls", async () => {
    const key1 = await getOrCreateDeviceKey();
    const key2 = await getOrCreateDeviceKey();

    expect(key1.accountId).toBe(key2.accountId);
    expect(key1.publicKey).toBe(key2.publicKey);
    expect(key1.privateKey).toBe(key2.privateKey);
  });
});
