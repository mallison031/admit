import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { StatusBanner } from "../components/StatusBanner";

describe("StatusBanner component", () => {
  it("renders status badge and description for Issued", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatusBanner status="Issued" />);
    });

    expect(container.textContent).toContain("Issued (Active)");
    expect(container.textContent).toContain("Deposit is locked in the pool");

    root.unmount();
    container.remove();
  });

  it("renders status badge for PendingCouncil", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<StatusBanner status="PendingCouncil" />);
    });

    expect(container.textContent).toContain("Pending Council Approval");

    root.unmount();
    container.remove();
  });
});
