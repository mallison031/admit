import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { AmountInput } from "../components/AmountInput";

describe("AmountInput component", () => {
  it("renders with value and label", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    let val = "150.00";
    await act(async () => {
      root.render(
        <AmountInput
          value={val}
          onChange={(v) => {
            val = v;
          }}
          max="400.00"
          label="Deposit Amount"
        />,
      );
    });

    const input = container.querySelector("input");
    expect(input).not.toBeNull();
    expect(input?.value).toBe("150.00");
    expect(container.textContent).toContain("Deposit Amount");
    expect(container.textContent).toContain("Max: 400.00");

    root.unmount();
    container.remove();
  });
});
