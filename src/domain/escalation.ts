import { PRESETS } from "./presets";
import type { Reminder, ReminderState, StepKey } from "./reminder";

const ORDER: StepKey[] = ["notification", "alarm", "user-call", "emergency-call"];
const NEXT: Record<StepKey, ReminderState> = {
  notification: "notification", alarm: "alarm", "user-call": "user-call", "emergency-call": "grace-window",
};

export interface Transition { reminder: Reminder; dueStep?: StepKey; blockedReason?: string; }

export function reconcile(reminder: Reminder, now: number): Transition {
  if (["acknowledged", "cancelled", "blocked"].includes(reminder.state)) return { reminder };
  if (reminder.state === "grace-window" && reminder.graceEndsAt && now >= reminder.graceEndsAt) {
    return { reminder: { ...reminder, state: "emergency-call-ready" } };
  }
  const preset = PRESETS[reminder.category];
  for (const [index, step] of ORDER.entries()) {
    if (reminder.completedSteps.includes(step)) continue;
    const prior = reminder.scheduledAt + ORDER.slice(0, index + 1).reduce((sum, key) => sum + preset.delays[key], 0);
    if (now < prior) return { reminder };
    if (step === "emergency-call" && (!reminder.consent || !reminder.emergencyContact.verified)) {
      return { reminder: { ...reminder, state: "blocked", lastError: "Emergency contact consent and verification are required." }, blockedReason: "Emergency contact safeguards are incomplete." };
    }
    const updated: Reminder = {
      ...reminder,
      state: step === "emergency-call" ? "grace-window" : NEXT[step],
      completedSteps: [...reminder.completedSteps, step],
      graceEndsAt: step === "emergency-call" ? now + preset.delays["emergency-call"] : reminder.graceEndsAt,
    };
    return { reminder: updated, dueStep: step };
  }
  return { reminder };
}

export function acknowledge(reminder: Reminder): Reminder {
  return { ...reminder, state: "acknowledged", graceEndsAt: undefined };
}
export function cancel(reminder: Reminder): Reminder {
  return { ...reminder, state: "cancelled", graceEndsAt: undefined };
}

export function retryLastStep(reminder: Reminder): Reminder {
  return { ...reminder, completedSteps: reminder.completedSteps.slice(0, -1), lastError: undefined };
}
