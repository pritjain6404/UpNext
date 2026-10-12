import type { VercelRequest, VercelResponse } from "@vercel/node";
import { accessToken, configured, cookie, decode, CALENDAR_API } from "../_google";

type GoogleEvent = { id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.status(503).json({ error: "Google Calendar is not configured on this deployment." });
  const refreshToken = decode(cookie(req, "upnext_google_refresh"));
  if (!refreshToken) return res.status(401).json({ error: "Connect Google Calendar first." });
  try {
    const token = await accessToken(refreshToken);
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const url = new URL(`${CALENDAR_API}/calendars/primary/events`);
    url.search = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "25" }).toString();
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error("Calendar events could not be loaded.");
    const payload = (await response.json()) as { items?: GoogleEvent[] };
    return res.status(200).json({
      events: (payload.items ?? []).filter((event) => event.start?.dateTime).map((event) => ({
        id: event.id,
        title: event.summary?.trim() || "Calendar event",
        startsAt: event.start!.dateTime,
        endsAt: event.end?.dateTime,
      })),
    });
  } catch {
    return res.status(502).json({ error: "Google Calendar could not be reached. Try connecting again." });
  }
}
