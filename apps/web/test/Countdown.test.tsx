import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { Countdown } from "../components/Countdown";

describe("Countdown component", () => {
  it("renders countdown when guarantee is unaccepted", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const futureNs = BigInt(Date.now() + 60_000) * 1_000_000n;
    await act(async () => {
      root.render(<Countdown targetNs={futureNs} isAccepted={false} />);
    });

    expect(container.textContent).toContain("Expires in:");

    root.unmount();
    container.remove();
  });

  it("is hidden when guarantee is accepted", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const futureNs = BigInt(Date.now() + 60_000) * 1_000_000n;
    await act(async () => {
      root.render(<Countdown targetNs={futureNs} isAccepted={true} />);
    });

    expect(container.innerHTML).toBe("");

    root.unmount();
    container.remove();
  });
});
