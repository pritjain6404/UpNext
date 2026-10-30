import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { acknowledge, cancel, reconcile } from "../domain/escalation";
import type { AlarmSound, Reminder } from "../domain/reminder";
import { isAlarmActive } from "../domain/reminder";
import { loadReminders, saveReminders } from "../domain/storage";
import { requestNotifications, notify } from "../platform/notifications";
import { playAlarm, primeAudio } from "../platform/audio";
import { startClock } from "../platform/clock";
import { ReminderForm, type FormValue } from "./components/ReminderForm";
import { ReminderList } from "./components/ReminderList";
import { ActiveReminder } from "./components/ActiveReminder";
import { PermissionStatus } from "./components/PermissionStatus";
import { CalendarCard } from "./components/CalendarCard";
import { TasksCard } from "./components/TasksCard";
import { AnalyticsConsent } from "./components/AnalyticsConsent";
import "../styles.css";

function createReminder(value: FormValue): Reminder {
  return { id: crypto.randomUUID(), title: value.title.trim(), scheduledAt: value.scheduledAt, sound: value.sound, state: "pending", createdAt: Date.now() };
}

export function App() {
  const initialStorage = useMemo(() => loadReminders(), []);
  const [reminders, setReminders] = useState<Reminder[]>(initialStorage.reminders);
  const remindersRef = useRef(reminders);
  const [notification, setNotification] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [audio, setAudio] = useState("not enabled");
  const [storage, setStorage] = useState(initialStorage.error ?? "ready");
  const active = useMemo(() => reminders.find(isAlarmActive), [reminders]);
  const update = useCallback((updater: (current: Reminder[]) => Reminder[]) => {
    const next = updater(remindersRef.current);
    if (next === remindersRef.current) return;
    remindersRef.current = next;
    setReminders(next);
    if (!saveReminders(next)) setStorage("blocked");
  }, []);

  useEffect(() => {
    const stop = startClock((now) => {
      const due: Reminder[] = [];
      update((current) => {
        let next: Reminder[] | null = null;
        current.forEach((reminder, index) => {
          const transition = reconcile(reminder, now);
          if (transition.due) {
            due.push(transition.reminder);
            next ??= [...current];
            next[index] = transition.reminder;
          }
        });
        return next ?? current;
      });
      for (const reminder of due) {
        const notificationResult = notify(reminder.title, "Your reminder is due.");
        setNotification(notificationResult === "success" ? "granted" : "denied");
        void playAlarm(reminder.sound).then((audioResult) => {
          setAudio(audioResult === "success" ? "ready" : audioResult);
          const errors = [
            notificationResult === "success" ? null : "Notification permission is unavailable or denied.",
            audioResult === "success" ? null : "Audio was blocked. Tap Play sound again.",
          ].filter(Boolean);
          if (errors.length) update((current) => current.map((item) => item.id === reminder.id ? { ...item, lastError: errors.join(" ") } : item));
        });
      }
    });
    return stop;
  }, [update]);

  const previewSound = (sound: AlarmSound) => { void playAlarm(sound).then((result) => setAudio(result === "success" ? "ready" : result)); };
  const testNotification = () => {
    void requestNotifications().then((result) => {
      setNotification(result === "success" ? "granted" : result === "unsupported" ? result : Notification.permission);
      if (result === "success") notify("TinkleMe test", "Browser notifications are working.");
    }).catch(() => setNotification("denied"));
  };
  const testSound = () => previewSound("chime");
  const create = (value: FormValue) => {
    void primeAudio().then((result) => setAudio(result === "success" ? "ready" : result));
    update((current) => [...current, createReminder(value)]);
    void requestNotifications().then((result) => setNotification(result === "success" ? "granted" : result)).catch(() => setNotification("denied"));
  };

  return <main>
    <header className="site-header">
      <div className="brand"><span className="brand-mark" aria-hidden="true">T</span><span>TinkleMe</span></div>
      <span className="header-note">A little more room to breathe</span>
    </header>
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">YOUR DAY, IN A GENTLER RHYTHM</p>
        <h1 id="hero-title">Make room for <em>what matters.</em></h1>
        <p className="lede">Your events, tasks and reminders in one quiet place. Stay present for today, and ready for what comes next.</p>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div className="hero-ring hero-ring-outer" />
        <div className="hero-ring hero-ring-inner" />
        <div className="hero-note"><span>ONE MOMENT AT A TIME</span><strong>Find your<br />flow.</strong><small>✳ TinkleMe</small></div>
      </div>
    </section>
    <PermissionStatus notification={notification} audio={audio} storage={storage} onTestNotification={testNotification} onTestSound={testSound} />
    <div className="integrations"><CalendarCard /><TasksCard /></div>
    {active && <ActiveReminder reminder={active} onAcknowledge={() => update((current) => current.map((item) => item.id === active.id ? acknowledge(item) : item))} onCancel={() => update((current) => current.map((item) => item.id === active.id ? cancel(item) : item))} onReplay={() => previewSound(active.sound)} />}
    <div className="layout" data-clarity-mask="true"><ReminderForm onCreate={create} onPreview={previewSound} /><ReminderList reminders={reminders} /></div>
    <footer><span>TinkleMe</span><span>Browser notifications and your chosen alarm sound work while this tab stays open.</span></footer>
    <AnalyticsConsent />
  </main>;
}
