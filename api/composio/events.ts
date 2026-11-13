import type { VercelRequest, VercelResponse } from "@vercel/node";
import { composioFetch, configured } from "../_composio.js";
import { connectedAccountIds } from "../_account-cookies.js";

type ComposioEvent = { id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };
type CalendarResult = { events?: { event?: ComposioEvent; source_calendar_id?: string; source_calendar_summary?: string }[]; errors_by_calendar?: Record<string, string> };
type ComposioRequest = (path: string, init: RequestInit) => Promise<Response>;

export async function ownsConnectedAccount(connectedAccountId: string, request: ComposioRequest = composioFetch) {
  if (!/^[A-Za-z0-9_-]+$/.test(connectedAccountId)) return false;
  const response = await request(`/connected_accounts/${connectedAccountId}`, { method: "GET" });
  if (!response.ok) {
    console.error("Composio account lookup failed", response.status);
    throw new Error("Composio account lookup failed.");
  }
  const account = (await response.json()) as { user_id?: string; userId?: string; status?: string; auth_config?: { id?: string } };
  return (account.user_id ?? account.userId) === process.env.COMPOSIO_USER_ID && account.status === "ACTIVE" && account.auth_config?.id === process.env.COMPOSIO_AUTH_CONFIG_ID;
}

export async function loadCalendarEvents(connectedAccountId: string, now = Date.now(), request: ComposioRequest = composioFetch) {
  const response = await request("/tools/execute/GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS", {
    method: "POST",
    body: JSON.stringify({
      connected_account_id: connectedAccountId,
      user_id: process.env.COMPOSIO_USER_ID,
      version: "latest",
      arguments: {
        time_min: new Date(now).toISOString(),
        time_max: new Date(now + 90 * 24 * 60 * 60 * 1000).toISOString(),
        max_results_per_calendar: 250,
        single_events: true,
        response_detail: "full",
      },
    }),
  });
  const payload = (await response.json()) as { successful?: boolean; data?: CalendarResult | string; error?: string };
  if (!response.ok) console.error("Composio event tool HTTP failure", response.status);
  if (!response.ok || payload.successful !== true) {
    if (response.ok) console.error("Composio event tool reported failure");
    throw new Error(payload.error ?? "Composio could not load calendar events.");
  }
  const data = typeof payload.data === "string" ? JSON.parse(payload.data) as CalendarResult : payload.data;
  const events = (data?.events ?? []).filter(({ event }) => event?.start?.dateTime || event?.start?.date).map(({ event, source_calendar_id, source_calendar_summary }) => ({
    id: `${source_calendar_id ?? "calendar"}:${event?.id ?? "event"}`,
    title: event?.summary?.trim() || "Calendar event",
    startsAt: event?.start?.dateTime ?? event?.start?.date,
    endsAt: event?.end?.dateTime ?? event?.end?.date,
    calendar: source_calendar_summary ?? "Calendar",
  }));
  return { events, failedCalendars: Object.keys(data?.errors_by_calendar ?? {}).length };
}

export async function serveCalendarEvents(req: VercelRequest, res: VercelResponse, request: ComposioRequest = composioFetch) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.status(503).json({ error: "Composio Calendar is not configured on this deployment." });
  const accountIds = connectedAccountIds(req, "calendar");
  if (!accountIds.length) return res.status(401).json({ error: "Connect Google Calendar first." });
  try {
    const results = await Promise.allSettled(accountIds.map(async (id, index) => {
      if (!await ownsConnectedAccount(id, request)) throw new Error("Account is not active.");
      const data = await loadCalendarEvents(id, Date.now(), request);
      return { events: data.events.map((event) => ({ ...event, id: `${index + 1}:${event.id}`, account: `Account ${index + 1}` })), failedCalendars: data.failedCalendars };
    }));
    const events = results.flatMap((result) => result.status === "fulfilled" ? result.value.events : []).sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
    const failedAccountIndices = results.flatMap((result, index) => result.status === "rejected" ? [index + 1] : []);
    const failedAccounts = failedAccountIndices.length;
    const failedCalendars = results.reduce((count, result) => count + (result.status === "fulfilled" ? result.value.failedCalendars : 0), 0);
    if (failedAccounts === accountIds.length) return res.status(502).json({ error: "Connected calendars could not be loaded. Remove failed connections and connect again.", failedAccountIndices });
    return res.status(200).json({ events, failedAccounts, failedAccountIndices, failedCalendars });
  } catch {
    return res.status(502).json({ error: "Composio could not load Google Calendar. Try connecting again." });
  }
}

export default serveCalendarEvents;
