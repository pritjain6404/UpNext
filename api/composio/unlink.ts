import type { VercelRequest, VercelResponse } from "@vercel/node";
import { accountCookie, connectedAccountIds } from "../_account-cookies.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed." });
  if (!process.env.COMPOSIO_API_KEY) return res.status(503).json({ error: "Google connections are not configured." });
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (typeof origin !== "string" || typeof host !== "string" || origin !== `https://${host}`) return res.status(403).json({ error: "Request origin not allowed." });
  const service = req.body?.service;
  const index = req.body?.index;
  if ((service !== "calendar" && service !== "tasks") || !Number.isInteger(index)) return res.status(400).json({ error: "Invalid connection." });
  const ids = connectedAccountIds(req, service);
  if (index < 1 || index > ids.length) return res.status(400).json({ error: "Invalid connection." });
  res.setHeader("Set-Cookie", accountCookie(service, ids.filter((_, position) => position !== index - 1)));
  return res.status(200).json({ disconnected: true });
}
