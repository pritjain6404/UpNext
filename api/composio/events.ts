import type { VercelRequest, VercelResponse } from "@vercel/node";
import { composioFetch, configured, cookie } from "../_composio";

type ComposioEvent = { id?: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.status(503).json({ error: "Composio Calendar is not configured on this deployment." });
  const connectedAccountId = cookie(req, "upnext_composio_account");
  if (!connectedAccountId) return res.status(401).json({ error: "Connect Google Calendar first." });
  try {
    const response = await composioFetch("/tools/execute", {
      method: "POST",
      body: JSON.stringify({
        tool_slug: "GOOGLECALENDAR_EVENTS_LIST",
        connected_account_id: connectedAccountId,
        toolkit_version: "latest",
        inputs: {
          calendar_id: "primary",
          timeMin: new Date().toISOString(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          maxResults: 25,
          singleEvents: true,
          orderBy: "startTime",
        },
      }),
    });
    const payload = (await response.json()) as { data?: { items?: ComposioEvent[] } | string; error?: string };
    if (!response.ok) throw new Error(payload.error ?? "Composio could not load calendar events.");
    const data = typeof payload.data === "string" ? JSON.parse(payload.data) as { items?: ComposioEvent[] } : payload.data;
    return res.status(200).json({
      events: (data?.items ?? []).filter((event) => event.start?.dateTime).map((event) => ({
        id: event.id,
        title: event.summary?.trim() || "Calendar event",
        startsAt: event.start!.dateTime,
        endsAt: event.end?.dateTime,
      })),
    });
  } catch {
    return res.status(502).json({ error: "Composio could not load Google Calendar. Try connecting again." });
  }
}
