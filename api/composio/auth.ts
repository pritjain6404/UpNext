import type { VercelRequest, VercelResponse } from "@vercel/node";
import { configured, composioFetch, redirectUri } from "../_composio.js";
import { pendingLinkCookie } from "../_account-cookies.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  try {
    const response = await composioFetch("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: process.env.COMPOSIO_AUTH_CONFIG_ID,
        user_id: process.env.COMPOSIO_USER_ID,
        callback_url: redirectUri(),
      }),
    });
    const payload = (await response.json()) as { redirect_url?: string; redirectUrl?: string; connected_account_id?: string; error?: string };
    const url = payload.redirect_url ?? payload.redirectUrl;
    if (!response.ok || !url || !payload.connected_account_id) throw new Error(payload.error ?? "Composio could not start authorization.");
    res.setHeader("Set-Cookie", pendingLinkCookie("calendar", payload.connected_account_id));
    return res.redirect(url);
  } catch {
    return res.redirect("/?calendar=failed");
  }
}
