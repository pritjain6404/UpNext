// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { App } from "./App.js";

vi.mock("./components/CalendarCard.js", () => ({ CalendarCard: () => null }));
vi.mock("./components/TasksCard.js", () => ({ TasksCard: () => null }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("presents UpNext as free without a checkout offer", async () => {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => root.render(createElement(App)));

  expect(container.textContent).toContain("Stay with what’s next.");
  expect(container.textContent).not.toContain("UPNEXT PRO");
  expect(container.textContent).not.toContain("Try test checkout");

  await act(async () => root.unmount());
  container.remove();
});
