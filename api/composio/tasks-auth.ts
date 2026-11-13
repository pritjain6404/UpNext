import type { VercelRequest, VercelResponse } from "@vercel/node";
import { composioFetch, tasksConfigured } from "../_composio.js";
import { pendingLinkCookie } from "../_account-cookies.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!tasksConfigured()) return res.redirect("/?tasks=not-configured");
  try {
    const response = await composioFetch("/connected_accounts/link", {
      method: "POST",
      body: JSON.stringify({
        auth_config_id: process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID,
        user_id: process.env.COMPOSIO_USER_ID,
        callback_url: process.env.COMPOSIO_TASKS_REDIRECT_URI,
      }),
    });
    const payload = (await response.json()) as { redirect_url?: string; redirectUrl?: string; connected_account_id?: string };
    const url = payload.redirect_url ?? payload.redirectUrl;
    if (!response.ok || !url || !payload.connected_account_id || !/^https:\/\//.test(url)) throw new Error("Could not start Tasks connection.");
    res.setHeader("Set-Cookie", pendingLinkCookie("tasks", payload.connected_account_id));
    return res.redirect(url);
  } catch {
    return res.redirect("/?tasks=failed");
  }
}
