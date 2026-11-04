import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { GuaranteeQr } from "../components/GuaranteeQr";

describe("GuaranteeQr component", () => {
  it("renders guarantee id and contract details", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <GuaranteeQr
          network="testnet"
          contractId="admit.testnet"
          guaranteeId={42}
        />,
      );
    });

    expect(container.textContent).toContain("Guarantee #42");
    expect(container.textContent).toContain("admit.testnet (testnet)");

    root.unmount();
    container.remove();
  });
});
