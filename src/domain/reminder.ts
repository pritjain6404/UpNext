export type Category = "routine" | "important" | "critical";
export type ReminderState =
  | "pending" | "notification" | "alarm" | "user-call" | "grace-window"
  | "emergency-call-ready" | "acknowledged" | "cancelled" | "blocked";
export type StepKey = "notification" | "alarm" | "user-call" | "emergency-call";

export interface Contact {
  name: string;
  phone: string;
  verified: boolean;
}

export interface Reminder {
  id: string;
  title: string;
  scheduledAt: number;
  category: Category;
  userPhone: string;
  emergencyContact: Contact;
  consent: boolean;
  state: ReminderState;
  completedSteps: StepKey[];
  createdAt: number;
  graceEndsAt?: number;
  lastError?: string;
}

export const STEP_LABELS: Record<StepKey, string> = {
  notification: "Notification",
  alarm: "Alarm",
  "user-call": "Call you",
  "emergency-call": "Emergency contact",
};
export const STATE_LABELS: Record<ReminderState, string> = {
  pending: "Pending", notification: "Notification", alarm: "Alarm", "user-call": "Call you",
  "grace-window": "Grace window", "emergency-call-ready": "Emergency call ready",
  acknowledged: "Acknowledged", cancelled: "Cancelled", blocked: "Blocked",
};
export function isEscalationActive(reminder: Reminder): boolean {
  return ["notification", "alarm", "user-call", "grace-window", "emergency-call-ready", "blocked"].includes(reminder.state);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length < 4 ? "••••" : `••• ••• ${digits.slice(-4)}`;
}

export function validateReminderInput(input: {
  title: string; scheduledAt: number; userPhone: string;
  contactName: string; contactPhone: string; consent: boolean; contactVerified: boolean;
}): string[] {
  const errors: string[] = [];
  if (!input.title.trim()) errors.push("Add a title.");
  if (!Number.isFinite(input.scheduledAt)) errors.push("Choose a date and time.");
  if (input.scheduledAt <= Date.now()) errors.push("Choose a time in the future.");
  if (input.userPhone.replace(/\D/g, "").length < 7) errors.push("Enter a valid phone number.");
  if (!input.contactName.trim()) errors.push("Name your emergency contact.");
  if (input.contactPhone.replace(/\D/g, "").length < 7) errors.push("Enter a valid emergency-contact number.");
  if (!input.consent) errors.push("Consent is required before emergency escalation can be enabled.");
  if (!input.contactVerified) errors.push("Confirm that you verified the emergency-contact number.");
  return errors;
}
