// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { accountCookie, connectedAccountIds, pendingLinkCookie } from "../_account-cookies.js";
import { handleTasksCallback } from "./tasks-callback.js";

function responseRecorder() {
  const result = { status: 200, body: undefined as unknown, redirect: "", cookies: [] as string[] };
  const response = {
    status(code: number) { result.status = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    redirect(location: string) { result.redirect = location; return this; },
    setHeader(_name: string, value: string[]) { result.cookies = value; return this; },
  };
  return { result, response: response as never };
}

beforeEach(() => {
  Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_TASKS_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_TASKS_REDIRECT_URI: "https://example.test/api/composio/tasks-callback" });
});

it("accepts a signed hosted-link callback and preserves the previous account", async () => {
  const { result, response } = responseRecorder();
  const previous = accountCookie("tasks", ["ca_first"]).split(";")[0];
  const pending = pendingLinkCookie("tasks", "ca_second").split(";")[0];
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
  await handleTasksCallback({ method: "GET", headers: { cookie: `${previous}; ${pending}` }, query: { status: "success", connected_account_id: "ca_second" } } as never, response, request);
  expect(result.redirect).toBe("/?tasks=connected");
  const saved = result.cookies.find((header) => header.startsWith("upnext_tasks_accounts="))?.split(";")[0];
  expect(connectedAccountIds({ headers: { cookie: saved } } as never, "tasks")).toEqual(["ca_first", "ca_second"]);
});

it("completes a session only for the marked account", async () => {
  const { result, response } = responseRecorder();
  const request = vi.fn()
    .mockResolvedValueOnce(new Response(JSON.stringify({ connected_account_id: "ca_second" }), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
  await handleTasksCallback({ method: "GET", headers: { cookie: pendingLinkCookie("tasks", "ca_second").split(";")[0] }, query: { session_uri: "session" } } as never, response, request);
  expect(result.redirect).toBe("/?tasks=connected");
  expect(request).toHaveBeenCalledWith("/connected_accounts/complete_auth", { method: "POST", body: JSON.stringify({ session_uri: "session", user_id: "owner" }) });
});

it("rejects a forged or mismatched callback before looking up the account", async () => {
  const request = vi.fn();
  const forged = responseRecorder();
  await handleTasksCallback({ method: "GET", headers: { cookie: "upnext_tasks_link=ca_second.invalid" }, query: { status: "success", connected_account_id: "ca_second" } } as never, forged.response, request);
  expect(forged.result.redirect).toBe("/?tasks=failed");
  const mismatched = responseRecorder();
  await handleTasksCallback({ method: "GET", headers: { cookie: pendingLinkCookie("tasks", "ca_first").split(";")[0] }, query: { status: "success", connected_account_id: "ca_second" } } as never, mismatched.response, request);
  expect(mismatched.result.redirect).toBe("/?tasks=failed");
  expect(request).not.toHaveBeenCalled();
});

it("rejects a connection for another auth configuration", async () => {
  const { result, response } = responseRecorder();
  const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "wrong" } }), { status: 200 }));
  await handleTasksCallback({ method: "GET", headers: { cookie: pendingLinkCookie("tasks", "ca_second").split(";")[0] }, query: { status: "success", connected_account_id: "ca_second" } } as never, response, request);
  expect(result.redirect).toBe("/?tasks=failed");
  expect(result.cookies).toEqual([]);
});

it("reports missing Tasks configuration without accepting a callback", async () => {
  const old = process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID;
  delete process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID;
  try {
    const { result, response } = responseRecorder();
    const request = vi.fn();
    await handleTasksCallback({ method: "GET", headers: {}, query: {} } as never, response, request);
    expect(result.redirect).toBe("/?tasks=not-configured");
    expect(request).not.toHaveBeenCalled();
  } finally {
    process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID = old;
  }
});
