// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { ReminderForm } from "./ReminderForm.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("offers a simple browser-only reminder with a selectable sound", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(ReminderForm, { onCreate: vi.fn(), onPreview: vi.fn() })));

  expect(container.querySelectorAll("input")).toHaveLength(2);
  expect(container.querySelector("select")?.textContent).toContain("Chime");
  expect(container.querySelector("select")?.textContent).toContain("Bell");
  expect(container.querySelector("select")?.textContent).toContain("Pulse");
  expect(container.textContent).not.toContain("Emergency-contact phone");
  expect(container.textContent).toContain("Preview sound");
  await act(async () => root.unmount());
  container.remove();
});
