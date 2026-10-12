import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCookie, configured, cookieHeader } from "../_composio";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  const connectedAccountId = typeof req.query.connected_account_id === "string"
    ? req.query.connected_account_id
    : typeof req.query.connectedAccountId === "string" ? req.query.connectedAccountId : null;
  if (!connectedAccountId) return res.redirect("/?calendar=failed");
  res.setHeader("Set-Cookie", [cookieHeader("upnext_composio_account", connectedAccountId, 60 * 60 * 24 * 30), clearCookie("upnext_google_refresh")]);
  return res.redirect("/?calendar=connected");
}
