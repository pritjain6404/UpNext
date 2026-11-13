import type { Reminder } from "./reminder";

export interface Transition { reminder: Reminder; due: boolean }

export function reconcile(reminder: Reminder, now: number): Transition {
  if (reminder.state !== "pending" || now < reminder.scheduledAt) return { reminder, due: false };
  return {
    reminder: { ...reminder, state: "alarm" },
    due: true,
  };
}

export function acknowledge(reminder: Reminder): Reminder {
  return { ...reminder, state: "acknowledged" };
}

export function cancel(reminder: Reminder): Reminder {
  return { ...reminder, state: "cancelled" };
}
