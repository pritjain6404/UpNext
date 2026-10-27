// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CalendarCard } from "./CalendarCard.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

it("shows a calendar sync error to the user", async () => {
  window.history.replaceState({}, "", "/?calendar=connected");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Calendar sync failed." }), { status: 502 })));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);

  await act(async () => { root.render(createElement(CalendarCard)); });

  expect(container.querySelector('[role="alert"]')?.textContent).toBe("Calendar sync failed.");
  expect(container.textContent).not.toContain("Google Calendar connected.");
  await act(async () => { root.unmount(); });
});

it("keeps the first account visible after a failed second connection", async () => {
  window.history.replaceState({}, "", "/?calendar=failed");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ events: [{ id: "one", title: "First account event", startsAt: "2026-10-20", account: "Account 1" }], failedAccounts: 0 }), { status: 200 })));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(createElement(CalendarCard)); });
  expect(container.textContent).toContain("First account event");
  expect(container.textContent).toContain("connection was not completed");
  await act(async () => { root.unmount(); });
});
