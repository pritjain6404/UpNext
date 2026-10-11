import type { Reminder, StepKey } from "../../domain/reminder";
import { STATE_LABELS, STEP_LABELS, maskPhone } from "../../domain/reminder";
import { callIntent } from "../../platform/telephony";
import { useEffect, useRef } from "react";
export function ActiveEscalation({ reminder, onAcknowledge, onCancel }: { reminder: Reminder; onAcknowledge: () => void; onCancel: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus(); }, [reminder.id, reminder.state]);
  const step = reminder.completedSteps.at(-1) as StepKey | undefined;
  const emergency = reminder.state === "grace-window" || reminder.state === "emergency-call-ready";
  const callReady = reminder.state === "emergency-call-ready";
  const phone = emergency ? reminder.emergencyContact.phone : reminder.userPhone;
  return <section ref={panel} tabIndex={-1} className={`active card ${emergency ? "urgent" : ""}`} aria-live="assertive">
    <div className="active-head"><div><p className="eyebrow">Escalating now</p><h2>{reminder.title}</h2></div><span className="pill">{STATE_LABELS[reminder.state]}</span></div>
    <p className="step-copy"><strong>{step ? STEP_LABELS[step] : "Reminder"}</strong>{reminder.lastError ? ` · ${reminder.lastError}` : emergency ? ` · Final grace window for ${reminder.emergencyContact.name}` : " · Acknowledge to stop every later step."}</p>
    {emergency && <div className="countdown">{callReady ? "Grace window ended. Review before initiating the emergency-contact call." : `Emergency-contact call action is locked during the final grace window. ${reminder.graceEndsAt ? `${Math.max(0, Math.ceil((reminder.graceEndsAt - Date.now()) / 1000))}s remaining.` : ""}`}</div>}
    <div className="actions"><button onClick={onAcknowledge}>I’m on it</button><button className="secondary" onClick={onAcknowledge}>Done</button>{emergency ? <><button className="danger" onClick={onCancel}>Cancel escalation</button>{callReady && <a className="button-link" href={callIntent(phone).uri}>Call {reminder.emergencyContact.name}</a>}</> : reminder.state === "user-call" ? <a className="button-link" href={callIntent(phone).uri}>Call me</a> : <span className="muted">Phone: {maskPhone(phone)}</span>}</div>
  </section>;
}
