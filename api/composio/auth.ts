import type { VercelRequest, VercelResponse } from "@vercel/node";
import { browserUser, configured, composioFetch, cookieHeader, newBrowserUser, redirectUri } from "../_composio.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  try {
    const existingUser = browserUser(req);
    const user = existingUser ?? newBrowserUser();
    const response = await composioFetch("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: process.env.COMPOSIO_AUTH_CONFIG_ID,
        user_id: user.id,
        callback_url: redirectUri(),
      }),
    });
    const payload = (await response.json()) as { redirect_url?: string; redirectUrl?: string; connected_account_id?: string; error?: string };
    const url = payload.redirect_url ?? payload.redirectUrl;
    if (!response.ok || !url || !payload.connected_account_id) throw new Error(payload.error ?? "Composio could not start authorization.");
    res.setHeader("Set-Cookie", [
      cookieHeader("upnext_composio_link", payload.connected_account_id, 10 * 60),
      ...(!existingUser ? [cookieHeader("upnext_user", user.token, 60 * 60 * 24 * 365)] : []),
    ]);
    return res.redirect(url);
  } catch {
    return res.redirect("/?calendar=failed");
  }
}
