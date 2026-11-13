import { useEffect, useRef } from "react";
import type { Reminder } from "../../domain/reminder";
import { SOUND_LABELS } from "../../domain/reminder";

export function ActiveReminder({ reminder, onAcknowledge, onCancel, onReplay }: {
  reminder: Reminder;
  onAcknowledge: () => void;
  onCancel: () => void;
  onReplay: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, [reminder.id]);
  return <section ref={panel} tabIndex={-1} className="active card" aria-live="assertive" data-clarity-mask="true">
    <div className="active-head"><div><p className="eyebrow">Reminder due</p><h2>{reminder.title}</h2></div><span className="pill">Now</span></div>
    <p className="step-copy">Browser alert · {SOUND_LABELS[reminder.sound]} alarm selected.</p>
    {reminder.lastError && <p className="errors" role="alert">{reminder.lastError}</p>}
    <div className="actions"><button onClick={onAcknowledge}>Done</button><button className="secondary" onClick={onReplay}>Play sound again</button><button className="secondary" onClick={onCancel}>Dismiss</button></div>
  </section>;
}
