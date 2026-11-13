import { describe, expect, it } from "vitest";
import { acknowledge, cancel, reconcile } from "./escalation";
import type { Reminder } from "./reminder";

const base: Reminder = {
  id: "1", title: "Test", scheduledAt: 1_000, sound: "chime",
  state: "pending", createdAt: 0,
};

describe("browser reminder delivery", () => {
  it("emits notification and alarm together once at the scheduled time", () => {
    expect(reconcile(base, 999)).toEqual({ reminder: base, due: false });
    const due = reconcile(base, 1_000);
    expect(due.due).toBe(true);
    expect(due.reminder).toMatchObject({ state: "alarm" });
    expect(reconcile(due.reminder, 2_000).due).toBe(false);
  });

  it("stops after acknowledgement or cancellation", () => {
    expect(reconcile(acknowledge(base), 2_000).due).toBe(false);
    expect(reconcile(cancel(base), 2_000).due).toBe(false);
  });
});
