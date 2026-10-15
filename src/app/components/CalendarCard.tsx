import { useEffect, useState } from "react";

type CalendarEvent = { id?: string; title: string; startsAt: string; endsAt?: string };

export function CalendarCard() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const state = new URLSearchParams(window.location.search).get("calendar");
  const [connected, setConnected] = useState(state === "connected");

  async function sync() {
    setLoading(true);
    setStatus(null);
    try {
      const response = await fetch("/api/composio/events");
      if (response.status === 401) {
        setConnected(false);
        setEvents([]);
        setStatus(state === "connected" ? "Reconnect Google Calendar to see events." : null);
        return;
      }
      const payload = (await response.json()) as { events?: CalendarEvent[]; error?: string };
      if (!response.ok) {
        setStatus(payload.error ?? "Calendar events could not be loaded.");
        return;
      }
      setConnected(true);
      setEvents(payload.events ?? []);
      setStatus(payload.events?.length ? null : "No events found in the next 30 days.");
    } catch {
      setStatus("Calendar sync could not be reached. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (state !== "failed" && state !== "not-configured") void sync();
  }, [state]);

  return (
    <section className="calendar-card card" aria-labelledby="calendar-title">
      <div>
        <p className="eyebrow">YOUR CALENDAR</p>
        <h2 id="calendar-title">Bring your day into view.</h2>
        <p className="muted">Connect Google Calendar to see upcoming events here. Your calendar is read-only.</p>
      </div>
      {state === "not-configured" && <p className="errors" role="alert">Google Calendar is not configured on this deployment yet.</p>}
      {state === "failed" && <p className="errors" role="alert">Google Calendar connection was not completed. Try again.</p>}
      {connected && <p className="calendar-connected" role="status">Google Calendar connected.</p>}
      <div className="calendar-actions">
        <a className="button-link" href="/api/composio/auth">Connect Google Calendar</a>
        {connected && <button type="button" className="secondary" onClick={() => void sync()} disabled={loading}>{loading ? "Syncing…" : "Sync now"}</button>}
      </div>
      {events.length > 0 && <div className="calendar-events">{events.map((event) => <article key={event.id ?? `${event.title}-${event.startsAt}`}><strong>{event.title}</strong><span>{new Date(event.startsAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span></article>)}</div>}
    </section>
  );
}
