import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { relay } from "../lib/relay";

describe("relay helper", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("relay_posts_payload to /relay and returns txHash", async () => {
    const mockTxHash = "9ZNhLrqs1q1f2vY";
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ txHash: mockTxHash }),
    });

    const res = await relay("mock_signed_delegate_base64");
    expect(res.txHash).toBe(mockTxHash);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/relay$/),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedDelegate: "mock_signed_delegate_base64" }),
      }),
    );
  });

  it("throws error when relay response is not ok", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "Rate limit exceeded",
    });

    await expect(relay("mock_signed_delegate_base64")).rejects.toThrow(
      "Relay failed (429): Rate limit exceeded",
    );
  });
});
