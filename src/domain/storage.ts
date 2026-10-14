import type { Reminder } from "./reminder";
const KEY = "upnext.reminders.v1";
export function loadReminders(): { reminders: Reminder[]; error?: string } {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || typeof (item as Reminder).id !== "string")) {
      return { reminders: [], error: "Saved reminders were invalid and could not be restored." };
    }
    return { reminders: parsed as Reminder[] };
  } catch {
    return { reminders: [], error: "Saved reminders could not be read." };
  }
}
export function saveReminders(reminders: Reminder[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(reminders)); return true; }
  catch { return false; }
}
