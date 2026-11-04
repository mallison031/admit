import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { DemoModeBanner } from "../components/DemoModeBanner";

describe("DemoModeBanner component", () => {
  it("renders warning when timeScale > 1", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DemoModeBanner timeScale={60} />);
    });

    expect(container.textContent).toContain("DEMO MODE");
    expect(container.textContent).toContain("×60");

    root.unmount();
    container.remove();
  });

  it("renders null when timeScale is 1", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(<DemoModeBanner timeScale={1} />);
    });

    expect(container.innerHTML).toBe("");

    root.unmount();
    container.remove();
  });
});
