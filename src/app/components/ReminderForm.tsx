import { useState } from "react";
import type { AlarmSound } from "../../domain/reminder";
import { SOUND_LABELS, validateReminderInput } from "../../domain/reminder";

export interface FormValue { title: string; scheduledAt: number; sound: AlarmSound }

function localDateTime(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ReminderForm({ onCreate, onPreview }: {
  onCreate: (value: FormValue) => void;
  onPreview: (sound: AlarmSound) => void;
}) {
  const [value, setValue] = useState<FormValue>(() => ({ title: "", scheduledAt: Date.now() + 300_000, sound: "chime" }));
  const [errors, setErrors] = useState<string[]>([]);
  const update = (patch: Partial<FormValue>) => setValue((current) => ({ ...current, ...patch }));
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateReminderInput(value);
    setErrors(nextErrors);
    if (nextErrors.length) return;
    onCreate(value);
    setValue((current) => ({ ...current, title: "", scheduledAt: Date.now() + 300_000 }));
  };

  return <form className="card form" onSubmit={submit}>
    <div><p className="eyebrow">New reminder</p><h2>What is up next?</h2><p className="muted">A notification and your chosen sound will play when it is due.</p></div>
    <label>Title<input value={value.title} onChange={(event) => update({ title: event.target.value })} placeholder="Morning workout" /></label>
    <label>When<input type="datetime-local" value={localDateTime(value.scheduledAt)} onChange={(event) => update({ scheduledAt: new Date(event.target.value).getTime() })} /></label>
    <label>Alarm sound<select value={value.sound} onChange={(event) => update({ sound: event.target.value as AlarmSound })}>{Object.entries(SOUND_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    <button type="button" className="secondary" onClick={() => onPreview(value.sound)}>Preview sound</button>
    {errors.length > 0 && <div className="errors" role="alert">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
    <button type="submit">Schedule reminder</button>
  </form>;
}
