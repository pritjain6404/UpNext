import type { VercelRequest, VercelResponse } from "@vercel/node";
import { composioFetch, tasksConfigured } from "../_composio.js";
import { connectedAccountIds } from "../_account-cookies.js";
import { verifyConnectedAccount } from "./callback.js";

type ComposioTask = { id?: string; title?: string; notes?: string; due?: string; status?: string; tasklist_id?: string; tasklist_title?: string };
type ComposioRequest = (path: string, init: RequestInit) => Promise<Response>;

export async function loadGoogleTasks(accountId: string, request: ComposioRequest = composioFetch) {
  const response = await request("/tools/execute/GOOGLETASKS_LIST_ALL_TASKS", {
    method: "POST",
    body: JSON.stringify({
      connected_account_id: accountId,
      user_id: process.env.COMPOSIO_USER_ID,
      version: "latest",
      arguments: { showCompleted: false, showDeleted: false, showHidden: false, max_tasks_total: 1000 },
    }),
  });
  const payload = (await response.json()) as { successful?: boolean; data?: { tasks?: ComposioTask[]; truncated?: boolean } | string; error?: string };
  if (!response.ok || payload.successful !== true) throw new Error(payload.error ?? "Could not load Google Tasks.");
  const data = typeof payload.data === "string" ? JSON.parse(payload.data) as { tasks?: ComposioTask[]; truncated?: boolean } : payload.data;
  return {
    tasks: (data?.tasks ?? []).filter((task) => task.status !== "completed").map((task) => ({
      id: `${task.tasklist_id ?? "list"}:${task.id ?? "task"}`,
      title: task.title?.trim() || "Untitled task",
      notes: task.notes?.trim() || undefined,
      due: task.due,
      list: task.tasklist_title?.trim() || "Tasks",
    })),
    truncated: data?.truncated === true,
  };
}

export async function serveGoogleTasks(req: VercelRequest, res: VercelResponse, request: ComposioRequest = composioFetch) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed." });
  if (!tasksConfigured()) return res.status(503).json({ error: "Google Tasks is not configured on this deployment." });
  const accountIds = connectedAccountIds(req, "tasks");
  if (!accountIds.length) return res.status(401).json({ error: "Connect Google Tasks first." });
  try {
    const results = await Promise.allSettled(accountIds.map(async (id, index) => {
      if (!await verifyConnectedAccount(id, process.env.COMPOSIO_USER_ID!, process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID!, request)) throw new Error("Account is not active.");
      const data = await loadGoogleTasks(id, request);
      return { tasks: data.tasks.map((task) => ({ ...task, id: `${index + 1}:${task.id}`, account: `Account ${index + 1}` })), truncated: data.truncated };
    }));
    const failedAccountIndices = results.flatMap((result, index) => result.status === "rejected" ? [index + 1] : []);
    const failedAccounts = failedAccountIndices.length;
    if (failedAccounts === accountIds.length) return res.status(502).json({ error: "Connected Google Tasks could not be loaded. Remove failed connections and connect again.", failedAccountIndices });
    return res.status(200).json({ tasks: results.flatMap((result) => result.status === "fulfilled" ? result.value.tasks : []), truncated: results.some((result) => result.status === "fulfilled" && result.value.truncated), failedAccounts, failedAccountIndices });
  } catch {
    return res.status(502).json({ error: "Google Tasks could not be loaded. Try syncing again." });
  }
}

export default serveGoogleTasks;
