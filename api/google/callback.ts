import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCookie, configured, cookie, decode, encode, exchangeCode, serializeCookie } from "../_google";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const savedState = cookie(req, "upnext_google_state");
  const decodedState = decode(state);
  if (!savedState || savedState !== state || !decodedState) return res.redirect("/?calendar=failed");
  try {
    const parsed = JSON.parse(decodedState) as { expiresAt: number };
    if (parsed.expiresAt < Date.now() || typeof req.query.code !== "string") throw new Error("Invalid authorization response.");
    const tokens = await exchangeCode(req, req.query.code);
    if (!tokens.refresh_token) throw new Error("Google did not return a refresh token.");
    res.setHeader("Set-Cookie", [
      serializeCookie("upnext_google_refresh", encode(tokens.refresh_token), 60 * 60 * 24 * 30),
      clearCookie("upnext_google_state"),
    ]);
    return res.redirect("/?calendar=connected");
  } catch {
    return res.redirect("/?calendar=failed");
  }
}
