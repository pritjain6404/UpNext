import { useState } from "react";
import type { Category } from "../../domain/reminder";
import { PRESETS } from "../../domain/presets";
import { validateReminderInput } from "../../domain/reminder";

export interface FormValue { title: string; scheduledAt: number; category: Category; userPhone: string; contactName: string; contactPhone: string; consent: boolean; contactVerified: boolean; }
const initial: FormValue = { title: "", scheduledAt: Date.now() + 300_000, category: "routine", userPhone: "", contactName: "", contactPhone: "", consent: false, contactVerified: false };
export function ReminderForm({ onCreate }: { onCreate: (value: FormValue) => void }) {
  const [value, setValue] = useState(initial); const [errors, setErrors] = useState<string[]>([]);
  const update = (patch: Partial<FormValue>) => setValue((current) => ({ ...current, ...patch }));
  const submit = (event: React.FormEvent) => { event.preventDefault(); const nextErrors = validateReminderInput(value); setErrors(nextErrors); if (!nextErrors.length) onCreate(value); };
  return <form className="card form" onSubmit={submit}>
    <div><p className="eyebrow">New reminder</p><h2>What is up next?</h2></div>
    <label>Title<input value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder="Morning workout" /></label>
    <div className="form-grid"><label>When<input type="datetime-local" value={new Date(value.scheduledAt - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)} onChange={(e) => update({ scheduledAt: new Date(e.target.value).getTime() })} /></label><label>Urgency<select value={value.category} onChange={(e) => update({ category: e.target.value as Category })}>{Object.entries(PRESETS).map(([key, preset]) => <option key={key} value={key}>{preset.label}</option>)}</select></label></div>
    <p className="hint">{PRESETS[value.category].description}</p>
    <div className="form-grid"><label>Your phone<input value={value.userPhone} onChange={(e) => update({ userPhone: e.target.value })} placeholder="+1 555 0100" /></label><label>Contact name<input value={value.contactName} onChange={(e) => update({ contactName: e.target.value })} placeholder="Alex" /></label></div>
    <label>Emergency-contact phone<input value={value.contactPhone} onChange={(e) => update({ contactPhone: e.target.value })} placeholder="+1 555 0101" /></label>
    <label className="checkbox"><input type="checkbox" checked={value.contactVerified} onChange={(e) => update({ contactVerified: e.target.checked })} /> I verified this emergency-contact number.</label>
    <label className="checkbox"><input type="checkbox" checked={value.consent} onChange={(e) => update({ consent: e.target.checked })} /> I consent to UpNext showing an emergency-contact call action if I do not respond.</label>
    {errors.length > 0 && <div className="errors" role="alert">{errors.map((error) => <span key={error}>{error}</span>)}</div>}
    <button type="submit">Schedule reminder</button>
  </form>;
}
