import type { AlarmSound, Reminder, ReminderState } from "./reminder";
const KEY = "upnext.reminders.v1";
const sounds: AlarmSound[] = ["chime", "bell", "pulse"];

function restoreReminder(item: Record<string, unknown>): Reminder {
  const oldState = item.state;
  const state: ReminderState = oldState === "acknowledged" || oldState === "cancelled" || oldState === "alarm"
    ? oldState : "pending";
  return {
    id: item.id as string,
    title: typeof item.title === "string" ? item.title : "Reminder",
    scheduledAt: typeof item.scheduledAt === "number" ? item.scheduledAt : Date.now(),
    sound: sounds.includes(item.sound as AlarmSound) ? item.sound as AlarmSound : "chime",
    state,
    createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    lastError: typeof item.lastError === "string" ? item.lastError : undefined,
  };
}
export function loadReminders(): { reminders: Reminder[]; error?: string } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || typeof (item as Reminder).id !== "string")) {
      return { reminders: [], error: "Saved reminders were invalid and could not be restored." };
    }
    return { reminders: (parsed as Record<string, unknown>[]).map(restoreReminder) };
  } catch {
    return { reminders: [], error: "Saved reminders could not be read." };
  }
}
export function saveReminders(reminders: Reminder[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(reminders)); return true; }
  catch { return false; }
}
