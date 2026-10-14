import type { Reminder } from "../../domain/reminder";
import { STATE_LABELS } from "../../domain/reminder";
import { PRESETS } from "../../domain/presets";
export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  return <section className="list"><div className="section-title"><div><p className="eyebrow">Your timeline</p><h2>Reminders</h2></div><span className="muted">{reminders.length} scheduled</span></div>{reminders.length === 0 ? <div className="empty">Your next commitment will appear here.</div> : reminders.map((reminder) => <article className="reminder-row" key={reminder.id}><div><strong>{reminder.title}</strong><span>{new Date(reminder.scheduledAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></div><span className={`tag ${reminder.category}`}>{PRESETS[reminder.category].label}</span><span className="state">{STATE_LABELS[reminder.state]}</span></article>)}</section>;
}
