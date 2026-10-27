import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clearCookie, composioFetch, tasksConfigured } from "../_composio.js";
import { completeComposioConnection, verifyConnectedAccount } from "./callback.js";
import { accountCookie, connectedAccountIds, pendingLinkAccountId } from "../_account-cookies.js";

type ComposioRequest = (path: string, init: RequestInit) => Promise<Response>;

export async function handleTasksCallback(req: VercelRequest, res: VercelResponse, request: ComposioRequest = composioFetch) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!tasksConfigured()) return res.redirect("/?tasks=not-configured");
  const pendingId = pendingLinkAccountId(req, "tasks");
  const userId = process.env.COMPOSIO_USER_ID;
  const configId = process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID;
  if (!pendingId || !userId || !configId) return res.redirect("/?tasks=failed");
  try {
    const sessionUri = typeof req.query.session_uri === "string" ? req.query.session_uri : null;
    const accountId = sessionUri
      ? await completeComposioConnection(sessionUri, userId, request)
      : req.query.status === "success" && typeof req.query.connected_account_id === "string"
        ? req.query.connected_account_id
        : null;
    if (!accountId || accountId !== pendingId || !await verifyConnectedAccount(accountId, userId, configId, request)) {
      return res.redirect("/?tasks=failed");
    }
    res.setHeader("Set-Cookie", [accountCookie("tasks", [...connectedAccountIds(req, "tasks"), accountId]), clearCookie("upnext_tasks_account"), clearCookie("upnext_tasks_link")]);
    return res.redirect("/?tasks=connected");
  } catch {
    return res.redirect("/?tasks=failed");
  }
}

export default handleTasksCallback;
