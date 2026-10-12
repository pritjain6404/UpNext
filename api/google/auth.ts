import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "node:crypto";
import { configured, encode, googleAuthUrl } from "../_google";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  const state = encode(JSON.stringify({ nonce: randomUUID(), expiresAt: Date.now() + 10 * 60_000 }));
  res.setHeader("Set-Cookie", `upnext_google_state=${state}; Max-Age=600; Path=/; HttpOnly; Secure; SameSite=Lax`);
  return res.redirect(googleAuthUrl(req, state));
}
