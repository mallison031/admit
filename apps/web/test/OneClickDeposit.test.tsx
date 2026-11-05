import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { OneClickDeposit } from "../components/OneClickDeposit";

describe("OneClickDeposit component", () => {
  it("renders chain options and quote button", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<OneClickDeposit memberAccount="member1.testnet" />);
    });

    expect(container.textContent).toContain("1Click Any-Chain Top-Up");
    expect(container.textContent).toContain("Cross-Chain");

    const select = container.querySelector("select");
    expect(select).not.toBeNull();
    expect(select?.children.length).toBeGreaterThanOrEqual(4);

    const quoteBtn = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Get Quote"),
    );
    expect(quoteBtn).toBeDefined();

    root.unmount();
    container.remove();
  });

  it("fetches quote and reveals quote card upon clicking Get Quote", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          quoteId: "dry_quote_test123",
          amountIn: "50000000",
          amountOut: "49850000",
          minAmountOut: "49700000",
          estimatedTimeSeconds: 15,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      )) as unknown as typeof fetch;

    try {
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);

      await act(async () => {
        root.render(<OneClickDeposit memberAccount="member1.testnet" />);
      });

      const quoteBtn = Array.from(container.querySelectorAll("button")).find((b) =>
        b.textContent?.includes("Get Quote"),
      );
      expect(quoteBtn).toBeDefined();

      await act(async () => {
        quoteBtn?.click();
      });

      // Check that quote route card appeared
      expect(container.textContent).toContain("1Click Defuse Route");
      expect(container.textContent).toContain("You Pay");
      expect(container.textContent).toContain("You Receive");
      expect(container.textContent).toContain("Deposit via 1Click (Dry-Run)");

      root.unmount();
      container.remove();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
