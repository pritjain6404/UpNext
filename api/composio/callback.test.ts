// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { completeComposioConnection, handleComposioCallback } from "./callback.js";
import { accountCookie, connectedAccountIds, pendingLinkCookie } from "../_account-cookies.js";

function responseRecorder() {
  const result = { statusCode: 200, body: undefined as unknown, redirect: "", headers: {} as Record<string, unknown> };
  const response = {
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    redirect(location: string) { result.redirect = location; return this; },
    setHeader(name: string, value: unknown) { result.headers[name] = value; return this; },
  };
  return { result, response: response as never };
}

describe("completeComposioConnection", () => {
  it("redeems the single-use session for the configured user", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      connected_account_id: "ca_owner",
      toolkit_slug: "googlecalendar",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(completeComposioConnection("session_uri", "upnext-owner", request)).resolves.toBe("ca_owner");
    expect(request).toHaveBeenCalledWith("/connected_accounts/complete_auth", {
      method: "POST",
      body: JSON.stringify({ session_uri: "session_uri", user_id: "upnext-owner" }),
    });
  });

  it("rejects callbacks that Composio cannot bind to the configured user", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "identity mismatch" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }));

    await expect(completeComposioConnection("session_uri", "upnext-owner", request)).rejects.toThrow(
      "Composio could not verify the returning user.",
    );
  });

  it("rejects a callback that was not initiated by this browser", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const { result, response } = responseRecorder();
    const request = vi.fn();
    await handleComposioCallback({ method: "GET", headers: {}, query: { session_uri: "session" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=failed");
    expect(request).not.toHaveBeenCalled();
  });

  it("sets the account cookie only after completing a marked callback", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const { result, response } = responseRecorder();
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ connected_account_id: "ca_owner" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
    await handleComposioCallback({ method: "GET", headers: { cookie: pendingLinkCookie("calendar", "ca_owner").split(";")[0] }, query: { session_uri: "session" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=connected");
    expect(result.headers["Set-Cookie"]).toEqual(expect.arrayContaining([expect.stringContaining("upnext_calendar_accounts="), expect.stringContaining("upnext_composio_link=; Max-Age=0")]));
  });

  it("accepts a normal hosted-link callback only for the account this browser started", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const { result, response } = responseRecorder();
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
    await handleComposioCallback({ method: "GET", headers: { cookie: pendingLinkCookie("calendar", "ca_owner").split(";")[0] }, query: { status: "success", connected_account_id: "ca_owner" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=connected");
    expect(request).toHaveBeenCalledWith("/connected_accounts/ca_owner", { method: "GET" });
  });

  it("rejects a callback for a different account without contacting Composio", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const { result, response } = responseRecorder();
    const request = vi.fn();
    await handleComposioCallback({ method: "GET", headers: { cookie: pendingLinkCookie("calendar", "ca_owner").split(";")[0] }, query: { status: "success", connected_account_id: "ca_other" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=failed");
    expect(request).not.toHaveBeenCalled();
  });

  it("rejects an account outside the configured user and auth config", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const { result, response } = responseRecorder();
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "another", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
    await handleComposioCallback({ method: "GET", headers: { cookie: pendingLinkCookie("calendar", "ca_owner").split(";")[0] }, query: { status: "success", connected_account_id: "ca_owner" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=failed");
    expect(result.headers["Set-Cookie"]).toBeUndefined();
  });

  it("keeps a previous Calendar account when another one connects", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    const previous = accountCookie("calendar", ["ca_first"]).split(";")[0];
    const { result, response } = responseRecorder();
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "config" } }), { status: 200 }));
    await handleComposioCallback({ method: "GET", headers: { cookie: `${previous}; ${pendingLinkCookie("calendar", "ca_second").split(";")[0]}` }, query: { status: "success", connected_account_id: "ca_second" } } as never, response, request);
    const saved = (result.headers["Set-Cookie"] as string[]).find((header) => header.startsWith("upnext_calendar_accounts="))?.split(";")[0];
    expect(connectedAccountIds({ headers: { cookie: saved } } as never, "calendar")).toEqual(["ca_first", "ca_second"]);
  });
});
