import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test } from "vitest";

test("vitest renders react elements in jsdom", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => {
    root.render(<div>Admit Web Test</div>);
  });

  expect(container.textContent).toBe("Admit Web Test");
  root.unmount();
  container.remove();
});
