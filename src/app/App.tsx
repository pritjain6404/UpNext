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
      setNotification(result === "success" ? "granted" : result);
      if (result === "success") notify("UpNext test", "Browser notifications are working.");
    }).catch(() => setNotification("denied"));
  };
  const create = (value: FormValue) => {
    void primeAudio().then((result) => setAudio(result === "success" ? "ready" : result));
    update((current) => [...current, createReminder(value)]);
    void requestNotifications().then((result) => setNotification(result === "success" ? "granted" : result)).catch(() => setNotification("denied"));
  };

  return <main><header className="hero"><div><p className="eyebrow">UPNEXT / RELIABLE RHYTHM</p><h1>Stay with what’s next.</h1><p className="lede">A calmer way to keep important moments in view.</p></div><div className="hero-orbit"><span>01</span><span>02</span><span>03</span><b>04</b></div></header>
    <PermissionStatus notification={notification} audio={audio} storage={storage} onTestNotification={testNotification} />
    <CalendarCard />
    <TasksCard />
    {active && <ActiveReminder reminder={active} onAcknowledge={() => update((current) => current.map((item) => item.id === active.id ? acknowledge(item) : item))} onCancel={() => update((current) => current.map((item) => item.id === active.id ? cancel(item) : item))} onReplay={() => previewSound(active.sound)} />}
    <div className="layout"><ReminderForm onCreate={create} onPreview={previewSound} /><ReminderList reminders={reminders} /></div>
    <footer>Browser notification + your selected alarm sound. Keep this tab open until the reminder is due.</footer>
  </main>;
}
