export type AlarmSound = "chime" | "bell" | "pulse";
export type ReminderState = "pending" | "alarm" | "acknowledged" | "cancelled";

export interface Reminder {
  id: string;
  title: string;
  scheduledAt: number;
  sound: AlarmSound;
  state: ReminderState;
  createdAt: number;
  lastError?: string;
}

export const SOUND_LABELS: Record<AlarmSound, string> = {
  chime: "Chime", bell: "Bell", pulse: "Pulse",
};

export const STATE_LABELS: Record<ReminderState, string> = {
  pending: "Scheduled", alarm: "Alerted", acknowledged: "Done", cancelled: "Cancelled",
};

export function isAlarmActive(reminder: Reminder): boolean {
  return reminder.state === "alarm";
}

export function validateReminderInput(input: { title: string; scheduledAt: number }): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Add a title.");
  if (!Number.isFinite(input.scheduledAt)) errors.push("Choose a date and time.");
  else if (input.scheduledAt <= Date.now()) errors.push("Choose a time in the future.");
  return errors;
}
