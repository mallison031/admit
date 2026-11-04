import { codeHash } from "@admit/core";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { CodeCheck } from "../components/CodeCheck";

describe("CodeCheck component", () => {
  it("verifies code against expected hash", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const testCode = "A1B2C3";
    const guaranteeId = 12;
    const hashBytes = await codeHash(testCode, guaranteeId);
    const hashHex = hashBytes
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    let verifiedCode = "";
    await act(async () => {
      root.render(
        <CodeCheck
          guaranteeId={guaranteeId}
          expectedCodeHashHex={hashHex}
          onVerified={(c) => {
            verifiedCode = c;
          }}
        />,
      );
    });

    const input = container.querySelector("input") as HTMLInputElement;
    const button = container.querySelector("button") as HTMLButtonElement;

    // Set value using React-compatible setter
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(input, testCode);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await act(async () => {
      button.click();
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(verifiedCode).toBe(testCode);
    expect(container.textContent).toContain("Verification code confirmed");

    root.unmount();
    container.remove();
  });
});
