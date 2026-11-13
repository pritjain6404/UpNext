// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from "vitest";
import { loadReminders } from "./storage";
import { reconcile } from "./escalation";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
});

it("keeps earlier reminders without enabling old phone escalation", () => {
  localStorage.setItem("upnext.reminders.v1", JSON.stringify([{
    id: "old", title: "Old reminder", scheduledAt: Date.now() + 60_000,
    category: "critical", userPhone: "+15550000000", state: "user-call",
    completedSteps: ["notification", "alarm", "user-call"], createdAt: 0,
  }]));
  expect(loadReminders().reminders[0]).toMatchObject({
    id: "old", sound: "chime", state: "pending",
  });
  expect(loadReminders().reminders[0]).not.toHaveProperty("completedSteps");
});

it("delivers a due legacy reminder after migration", () => {
  localStorage.setItem("upnext.reminders.v1", JSON.stringify([{ id: "old", title: "Due", scheduledAt: 1, state: "notification", createdAt: 0 }]));
  const restored = loadReminders().reminders[0];
  expect(restored.state).toBe("pending");
  expect(reconcile(restored, 2).due).toBe(true);
});
