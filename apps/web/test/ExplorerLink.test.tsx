import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ExplorerLink } from "../components/ExplorerLink";

describe("ExplorerLink component", () => {
  it("renders transaction link to nearblocks testnet", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const txHash = "9ZNhLrqs1q1f2vY";
    await act(async () => {
      root.render(<ExplorerLink type="tx" value={txHash} network="testnet" />);
    });

    const link = container.querySelector("a");
    expect(link).not.toBeNull();
    expect(link?.href).toBe(`https://testnet.nearblocks.io/txns/${txHash}`);

    root.unmount();
    container.remove();
  });

  it("renders account link to nearblocks mainnet", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const account = "alice.near";
    await act(async () => {
      root.render(<ExplorerLink type="account" value={account} network="mainnet" />);
    });

    const link = container.querySelector("a");
    expect(link?.href).toBe(`https://nearblocks.io/address/${account}`);

    root.unmount();
    container.remove();
  });
});
