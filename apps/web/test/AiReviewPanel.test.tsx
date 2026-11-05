import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { AiReviewPanel } from "../components/AiReviewPanel";

describe("AiReviewPanel", () => {
  const mockReview = {
    verdict: "FLAGGED: 1 line item exceeds reference tariff (suggested trim: $30)",
    flagged_lines: 1,
    report_hash: new Array(32).fill(7),
    signing_address: "0x4b20993Bc481177ec7E8f571ceCaE8A9e22C02db",
  };

  it("renders advisory banner, verdict, and TEE signer details", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AiReviewPanel review={mockReview} />);
    });

    const panel = container.querySelector('[data-testid="ai-review-panel"]');
    expect(panel).not.toBeNull();
    expect(container.textContent).toContain("AI Bill Review (Advisory Only)");
    expect(container.textContent).toContain("1 flagged item");
    expect(container.textContent).toContain(mockReview.verdict);
    expect(container.textContent).toContain(mockReview.signing_address);

    root.unmount();
    container.remove();
  });

  it("handles plural flagged items correctly", async () => {
    const multiFlagReview = {
      ...mockReview,
      flagged_lines: 3,
    };

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<AiReviewPanel review={multiFlagReview} />);
    });

    expect(container.textContent).toContain("3 flagged items");

    root.unmount();
    container.remove();
  });
});
