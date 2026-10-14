import { describe, expect, it } from "vitest";
import { acknowledge, cancel, reconcile, retryLastStep } from "./escalation";
import type { Reminder } from "./reminder";
const base: Reminder = { id: "1", title: "Test", scheduledAt: 1_000, category: "critical", userPhone: "+15550100", emergencyContact: { name: "Alex", phone: "+15550101", verified: true }, consent: true, state: "pending", completedSteps: [], createdAt: 0 };
describe("escalation engine", () => {
  it("emits each critical step once in order", () => {
    let reminder = base; const steps: string[] = [];
    for (const now of [1_000, 11_000, 41_000, 71_000]) { const result = reconcile(reminder, now); reminder = result.reminder; if (result.dueStep) steps.push(result.dueStep); }
    expect(steps).toEqual(["notification", "alarm", "user-call", "emergency-call"]); expect(reconcile(reminder, 100_000).dueStep).toBeUndefined();
  });
  it("stops after acknowledgement or grace cancellation", () => { expect(acknowledge(reconcile(base, 1_000).reminder).state).toBe("acknowledged"); expect(cancel({ ...base, state: "grace-window" }).state).toBe("cancelled"); });
  it("keeps the emergency call locked until grace expires", () => {
    let reminder = base;
    for (const now of [1_000, 11_000, 41_000, 71_000]) reminder = reconcile(reminder, now).reminder;
    expect(reminder.state).toBe("grace-window");
    expect(reconcile(reminder, 101_000).reminder.state).toBe("emergency-call-ready");
  });
  it("blocks emergency escalation without safeguards", () => {
    let reminder = { ...base, consent: false };
    for (const now of [1_000, 11_000, 41_000]) reminder = reconcile(reminder, now).reminder;
    expect(reconcile(reminder, 71_000).reminder.state).toBe("blocked");
  });
  it("does not compress overdue steps into consecutive ticks", () => {
    let reminder = reconcile(base, 100_000).reminder;
    expect(reminder.completedSteps).toEqual(["notification"]);
    reminder = reconcile(reminder, 100_001).reminder;
    expect(reminder.completedSteps).toEqual(["notification", "alarm"]);
  });
  it("makes a failed alert retryable", () => {
    const failed = { ...reconcile(base, 1_000).reminder, lastError: "Failed" };
    expect(retryLastStep(failed)).toMatchObject({ completedSteps: [], lastError: undefined });
  });
});
