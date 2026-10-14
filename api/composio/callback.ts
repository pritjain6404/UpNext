import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCookie, composioFetch, configured, cookie, cookieHeader } from "../_composio.js";

type ComposioRequest = (path: string, init: RequestInit) => Promise<Response>;

export async function completeComposioConnection(
  sessionUri: string,
  userId: string,
  request: ComposioRequest = composioFetch,
) {
  const response = await request("/connected_accounts/complete_auth", {
    method: "POST",
    body: JSON.stringify({ session_uri: sessionUri, user_id: userId }),
  });
  const payload = (await response.json()) as { connected_account_id?: string };
  if (!response.ok || !payload.connected_account_id) {
    throw new Error("Composio could not verify the returning user.");
  }
  return payload.connected_account_id;
}

export async function handleComposioCallback(req: VercelRequest, res: VercelResponse, request: ComposioRequest = composioFetch) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!configured()) return res.redirect("/?calendar=not-configured");
  if (!cookie(req, "upnext_composio_link")) return res.redirect("/?calendar=failed");
  const sessionUri = typeof req.query.session_uri === "string" ? req.query.session_uri : null;
  const userId = process.env.COMPOSIO_USER_ID;
  if (!sessionUri || !userId) return res.redirect("/?calendar=failed");
  try {
    const connectedAccountId = await completeComposioConnection(sessionUri, userId, request);
    res.setHeader("Set-Cookie", [cookieHeader("upnext_composio_account", connectedAccountId, 60 * 60 * 24 * 30), clearCookie("upnext_google_refresh"), clearCookie("upnext_composio_link")]);
    return res.redirect("/?calendar=connected");
  } catch {
    return res.redirect("/?calendar=failed");
  }
}

export default handleComposioCallback;
