// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { loadGoogleTasks, serveGoogleTasks } from "./tasks.js";
import { accountCookie } from "../_account-cookies.js";

describe("Google Tasks read-only contract", () => {
  it("lists open tasks across every task list and reports truncation", async () => {
    process.env.COMPOSIO_USER_ID = "owner";
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: true, data: { tasks: [
      { id: "a", title: "Pay bill", due: "2026-10-20T00:00:00Z", tasklist_id: "personal", tasklist_title: "Personal", status: "needsAction" },
      { id: "b", title: "Done", tasklist_id: "work", status: "completed" },
    ], truncated: true } }), { status: 200 }));
    await expect(loadGoogleTasks("ca_tasks", request)).resolves.toEqual({ tasks: [{ id: "personal:a", title: "Pay bill", notes: undefined, due: "2026-10-20T00:00:00Z", list: "Personal" }], truncated: true });
    expect(request).toHaveBeenCalledWith("/tools/execute/GOOGLETASKS_LIST_ALL_TASKS", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ connected_account_id: "ca_tasks", user_id: "owner", arguments: { showCompleted: false, showDeleted: false } });
  });

  it("rejects a successful HTTP response containing a failed tool execution", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: false, error: "scope missing" }), { status: 200 }));
    await expect(loadGoogleTasks("ca_tasks", request)).rejects.toThrow("scope missing");
  });

  it("merges open tasks from both connected accounts", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_TASKS_AUTH_CONFIG_ID: "ac_tasks", COMPOSIO_USER_ID: "owner", COMPOSIO_TASKS_REDIRECT_URI: "https://example.test/callback" });
    const cookie = accountCookie("tasks", ["ca_first", "ca_second"]).split(";")[0];
    const request = vi.fn(async (path: string, init: RequestInit) => path.startsWith("/connected_accounts/")
      ? new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "ac_tasks" } }), { status: 200 })
      : new Response(JSON.stringify({ successful: true, data: { tasks: [{ id: "one", title: JSON.parse(init.body as string).connected_account_id, tasklist_id: "list", status: "needsAction" }] } }), { status: 200 }));
    const result = { status: 0, body: undefined as unknown };
    const res = { status(code: number) { result.status = code; return this; }, json(body: unknown) { result.body = body; return this; } } as never;
    await serveGoogleTasks({ method: "GET", headers: { cookie } } as never, res, request);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ tasks: [{ title: "ca_first", account: "Account 1" }, { title: "ca_second", account: "Account 2" }] });
  });
});
