import type { VercelRequest, VercelResponse } from "@vercel/node";
import { composioFetch, configured, cookie } from "../_composio.js";

type ComposioEvent = { id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };
type ComposioRequest = (path: string, init: RequestInit) => Promise<Response>;

export async function ownsConnectedAccount(connectedAccountId: string, request: ComposioRequest = composioFetch) {
  if (!/^[A-Za-z0-9_-]+$/.test(connectedAccountId)) return false;
  const response = await request(`/connected_accounts/${connectedAccountId}`, { method: "GET" });
  if (!response.ok) {
    console.error("Composio account lookup failed", response.status);
    throw new Error("Composio account lookup failed.");
  }
  const account = (await response.json()) as { user_id?: string; userId?: string; status?: string };
  return (account.user_id ?? account.userId) === process.env.COMPOSIO_USER_ID && account.status === "ACTIVE";
}

export async function loadCalendarEvents(connectedAccountId: string, now = Date.now(), request: ComposioRequest = composioFetch) {
  const response = await request("/tools/execute/GOOGLECALENDAR_EVENTS_LIST", {
    method: "POST",
    body: JSON.stringify({
      connected_account_id: connectedAccountId,
      user_id: process.env.COMPOSIO_USER_ID,
      version: "latest",
      arguments: {
        calendarId: "primary",
        timeMin: new Date(now).toISOString(),
        timeMax: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 25,
        singleEvents: true,
        orderBy: "startTime",
      },
    }),
  });
  const payload = (await response.json()) as { successful?: boolean; data?: { items?: ComposioEvent[] } | string; error?: string };
  if (!response.ok) console.error("Composio event tool HTTP failure", response.status);
  if (!response.ok || payload.successful !== true) {
    if (response.ok) console.error("Composio event tool reported failure");
    throw new Error(payload.error ?? "Composio could not load calendar events.");
  }
  const data = typeof payload.data === "string" ? JSON.parse(payload.data) as { items?: ComposioEvent[] } : payload.data;
  return (data?.items ?? []).filter((event) => event.start?.dateTime || event.start?.date).map((event) => ({
    id: event.id,
    title: event.summary?.trim() || "Calendar event",
    startsAt: event.start?.dateTime ?? event.start?.date,
    endsAt: event.end?.dateTime ?? event.end?.date,
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.status(503).json({ error: "Composio Calendar is not configured on this deployment." });
  const connectedAccountId = cookie(req, "upnext_composio_account");
  if (!connectedAccountId) return res.status(401).json({ error: "Connect Google Calendar first." });
  try {
    if (!await ownsConnectedAccount(connectedAccountId)) {
      return res.status(401).json({ error: "Reconnect Google Calendar." });
    }
    return res.status(200).json({ events: await loadCalendarEvents(connectedAccountId) });
  } catch {
    return res.status(502).json({ error: "Composio could not load Google Calendar. Try connecting again." });
  }
}
