import { useEffect, useState } from "react";

type CalendarEvent = { id?: string; title: string; startsAt: string; endsAt?: string; calendar?: string; account?: string };

export function CalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const state = new URLSearchParams(window.location.search).get("calendar");
  const [connected, setConnected] = useState(false);
  const [failedAccountIndices, setFailedAccountIndices] = useState<number[]>([]);

  async function sync() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/composio/events");
      if (response.status === 401) {
        setConnected(false);
        setFailedAccountIndices([]);
        setEvents([]);
        setStatus(state === "connected" ? "Reconnect Google Calendar to see events." : null);
        return;
      }
      const payload = (await response.json()) as { events?: CalendarEvent[]; failedAccounts?: number; failedAccountIndices?: number[]; failedCalendars?: number; error?: string };
      setFailedAccountIndices(payload.failedAccountIndices ?? []);
      if (!response.ok) {
        setConnected((payload.failedAccountIndices?.length ?? 0) > 0);
        setEvents([]);
        setStatus(payload.error ?? "Calendar events could not be loaded.");
        return;
      }
      setConnected(true);
      setEvents(payload.events ?? []);
      setVisibleCount(30);
      setStatus(payload.failedAccounts ? `${payload.failedAccounts} connected account${payload.failedAccounts === 1 ? "" : "s"} could not be loaded. Remove the failed connection and reconnect it.` : payload.failedCalendars ? `${payload.failedCalendars} calendar${payload.failedCalendars === 1 ? "" : "s"} could not be loaded; available events are shown.` : payload.events?.length ? null : "No events found in the next 90 days.");
    } catch {
      setStatus("Calendar sync could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void sync();
  }, [state]);

  async function unlink(index: number) {
    setLoading(true);
    try {
      const response = await fetch("/api/composio/unlink", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ service: "calendar", index }) });
      if (!response.ok) throw new Error();
      await sync();
    } catch {
      setStatus("Could not remove the failed connection. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="calendar-card card" aria-labelledby="calendar-title" data-clarity-mask="true">
      <div>
        <p className="eyebrow">YOUR CALENDAR</p>
        <h2 id="calendar-title">Bring your day into view.</h2>
        <p className="muted">Events from every connected Google account and calendar for the next 90 days. Read-only. Connect each account in this browser.</p>
      </div>
      {state === "not-configured" && <p className="errors" role="alert">Google Calendar is not configured on this deployment yet.</p>}
      {state === "failed" && <p className="errors" role="alert">Google Calendar connection was not completed. Try again.</p>}
      {connected && <p className="calendar-connected" role="status">Google Calendar connected.</p>}
      {status && <p className="errors" role="alert">{status}</p>}
      <div className="calendar-actions">
        <a className="button-link" href="/api/composio/auth">{connected ? "Connect another Google account" : "Connect Google Calendar"}</a>
        {connected && <button type="button" className="secondary" onClick={() => void sync()} disabled={loading}>{loading ? "Syncing…" : "Sync now"}</button>}
        {failedAccountIndices.map((index) => <button key={index} type="button" className="secondary" onClick={() => void unlink(index)} disabled={loading}>Remove failed Account {index}</button>)}
      </div>
      {events.length > 0 && <div className="calendar-events">{events.slice(0, visibleCount).map((event) => <article key={event.id ?? `${event.title}-${event.startsAt}`}><strong>{event.title}</strong><span>{event.startsAt.length === 10 ? new Date(`${event.startsAt}T12:00:00`).toLocaleDateString([], { dateStyle: "medium" }) : new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}{event.calendar ? ` · ${event.calendar}` : ""}{event.account ? ` · ${event.account}` : ""}</span></article>)}</div>}
      {events.length > visibleCount && <button type="button" className="secondary" onClick={() => setVisibleCount((count) => count + 30)}>Show more events</button>}
    </section>
  );
}
