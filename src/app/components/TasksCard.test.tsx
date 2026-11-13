// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { TasksCard } from "./TasksCard.js";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
});

it("shows tasks from multiple lists including those without due dates", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tasks: [
    { id: "a:1", title: "Read", list: "Personal", account: "Account 1" },
    { id: "b:2", title: "Submit", list: "School", account: "Account 2", due: "2026-10-20T00:00:00Z" },
  ], failedAccounts: 1 }), { status: 200 })));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(createElement(TasksCard)); });
  expect(container.textContent).toContain("Read");
  expect(container.textContent).toContain("No due date · Personal · Account 1");
  expect(container.textContent).toContain("Submit");
  expect(container.textContent).toContain("School · Account 2");
  expect(container.textContent).toContain("1 connected account could not be loaded");
  await act(async () => { root.unmount(); });
});

it("keeps the first account's tasks visible after a failed second connection", async () => {
  window.history.replaceState({}, "", "/?tasks=failed");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tasks: [{ id: "one", title: "First account task", list: "Personal", account: "Account 1" }], failedAccounts: 0 }), { status: 200 })));
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => { root.render(createElement(TasksCard)); });
  expect(container.textContent).toContain("First account task");
  expect(container.textContent).toContain("connection was not completed");
  await act(async () => { root.unmount(); });
});
