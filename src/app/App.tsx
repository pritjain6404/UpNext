import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { reconcile, acknowledge, cancel, retryLastStep } from "../domain/escalation";
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
import { BillingCard } from "./components/BillingCard";
import { CalendarCard } from "./components/CalendarCard";
import "../styles.css";

function createReminder(value: FormValue): Reminder { return { id: crypto.randomUUID(), title: value.title.trim(), scheduledAt: value.scheduledAt, category: value.category, userPhone: value.userPhone, emergencyContact: { name: value.contactName.trim(), phone: value.contactPhone, verified: value.contactVerified }, consent: value.consent, state: "pending", completedSteps: [], createdAt: Date.now() }; }
export function App() {
  const initialStorage = useMemo(() => loadReminders(), []);
  const [reminders, setReminders] = useState<Reminder[]>(initialStorage.reminders);
  const remindersRef = useRef(reminders);
  const [notification, setNotification] = useState("not requested"); const [audio, setAudio] = useState("ready"); const [storage, setStorage] = useState(initialStorage.error ?? "ready");
  const active = useMemo(() => reminders.find(isEscalationActive), [reminders]);
  const update = useCallback((updater: (current: Reminder[]) => Reminder[]) => { const next = updater(remindersRef.current); remindersRef.current = next; setReminders(next); if (!saveReminders(next)) setStorage("blocked"); }, []);
  useEffect(() => { const stop = startClock((now) => { const due: Array<{ id: string; title: string; step: "notification" | "alarm" }> = []; update((current) => current.map((reminder) => { const transition = reconcile(reminder, now); if (transition.dueStep === "notification" || transition.dueStep === "alarm") due.push({ id: reminder.id, title: reminder.title, step: transition.dueStep }); return transition.reminder; })); for (const effect of due) { const result = effect.step === "notification" ? notify(effect.title, "Your next commitment is due.") : playAlarm(); if (effect.step === "alarm") setAudio(result === "success" ? "played" : "blocked"); update((current) => current.map((reminder) => reminder.id !== effect.id ? reminder : { ...reminder, lastError: result === "success" ? undefined : effect.step === "notification" ? "Notification permission was denied or unavailable." : "Audio playback was blocked. Tap the page and retry." })); } }); return stop; }, [update]);
  const create = async (value: FormValue) => { try { setNotification(await requestNotifications()); } catch { setNotification("denied"); } update((current) => [...current, createReminder(value)]); };
  return <main><header className="hero"><div><p className="eyebrow">UPNEXT / RELIABLE RHYTHM</p><h1>Stay with what’s next.</h1><p className="lede">A calmer escalation path for the moments you cannot afford to miss.</p><p className="browser-note">Reminders stay in this browser. Keep UpNext open for alerts; phone calls start only when you tap a call button.</p></div><div className="hero-orbit"><span>01</span><span>02</span><span>03</span><b>04</b></div></header>
    <PermissionStatus notification={notification} audio={audio} storage={storage} />
    <CalendarCard />
    {import.meta.env.VITE_DODO_PRODUCT_ID && <BillingCard />}
    {active && <ActiveEscalation reminder={active} onAcknowledge={() => update((current) => current.map((r) => r.id === active.id ? acknowledge(r) : r))} onCancel={() => update((current) => current.map((r) => r.id === active.id ? cancel(r) : r))} onRetry={() => update((current) => current.map((r) => r.id === active.id ? retryLastStep(r) : r))} />}
    <div className="layout"><ReminderForm onCreate={create} /><ReminderList reminders={reminders} /></div>
    <footer>Notification → alarm → call action → emergency contact action. You remain in control at every step.</footer>
  </main>;
}
