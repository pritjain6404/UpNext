import { useEffect, useMemo, useState } from "react";
import { reconcile, acknowledge, cancel } from "../domain/escalation";
import type { Reminder } from "../domain/reminder";
import { isEscalationActive } from "../domain/reminder";
import { loadReminders, saveReminders } from "../domain/storage";
import { requestNotifications, notify } from "../platform/notifications";
import { playAlarm } from "../platform/audio";
import { startClock } from "../platform/clock";
import { ReminderForm, type FormValue } from "./components/ReminderForm";
import { ReminderList } from "./components/ReminderList";
import { ActiveEscalation } from "./components/ActiveEscalation";
import { PermissionStatus } from "./components/PermissionStatus";
import "../styles.css";

function createReminder(value: FormValue): Reminder { return { id: crypto.randomUUID(), title: value.title.trim(), scheduledAt: value.scheduledAt, category: value.category, userPhone: value.userPhone, emergencyContact: { name: value.contactName.trim(), phone: value.contactPhone, verified: value.contactVerified }, consent: value.consent, state: "pending", completedSteps: [], createdAt: Date.now() }; }
export function App() {
  const initialStorage = useMemo(() => loadReminders(), []);
  const [reminders, setReminders] = useState<Reminder[]>(initialStorage.reminders);
  const [notification, setNotification] = useState("not requested"); const [audio, setAudio] = useState("ready"); const [storage, setStorage] = useState(initialStorage.error ?? "ready");
  const active = useMemo(() => reminders.find(isEscalationActive), [reminders]);
  const update = (updater: (current: Reminder[]) => Reminder[]) => { setReminders((current) => { const next = updater(current); if (!saveReminders(next)) setStorage("blocked"); return next; }); };
  useEffect(() => { const stop = startClock((now) => { update((current) => current.map((reminder) => { const transition = reconcile(reminder, now); if (!transition.dueStep) return transition.reminder; if (transition.dueStep === "notification" && notify(reminder.title, "Your next commitment is due.") !== "success") return { ...transition.reminder, state: "blocked", lastError: "Notification permission was denied or unavailable." }; if (transition.dueStep === "alarm") { const result = playAlarm(); setAudio(result === "success" ? "played" : "blocked"); if (result !== "success") return { ...transition.reminder, state: "blocked", lastError: "Audio playback was blocked. Tap the page and retry." }; } return transition.reminder; })); }); return stop; }, []);
  const create = async (value: FormValue) => { try { setNotification(await requestNotifications()); } catch { setNotification("denied"); } update((current) => [...current, createReminder(value)]); };
  return <main><header className="hero"><div><p className="eyebrow">UPNEXT / RELIABLE RHYTHM</p><h1>Stay with what’s next.</h1><p className="lede">A calmer escalation path for the moments you cannot afford to miss.</p></div><div className="hero-orbit"><span>01</span><span>02</span><span>03</span><b>04</b></div></header>
    <PermissionStatus notification={notification} audio={audio} storage={storage} />
    {active && <ActiveEscalation reminder={active} onAcknowledge={() => update((current) => current.map((r) => r.id === active.id ? acknowledge(r) : r))} onCancel={() => update((current) => current.map((r) => r.id === active.id ? cancel(r) : r))} />}
    <div className="layout"><ReminderForm onCreate={create} /><ReminderList reminders={reminders} /></div>
    <footer>Notification → alarm → call you → emergency contact. You remain in control at every step.</footer>
  </main>;
}
