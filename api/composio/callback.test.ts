// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { completeComposioConnection, handleComposioCallback } from "./callback";

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
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ connected_account_id: "ca_owner" }), { status: 200 }));
    await handleComposioCallback({ method: "GET", headers: { cookie: "upnext_composio_link=marker" }, query: { session_uri: "session" } } as never, response, request);
    expect(result.redirect).toBe("/?calendar=connected");
    expect(result.headers["Set-Cookie"]).toEqual(expect.arrayContaining([expect.stringContaining("upnext_composio_account=ca_owner"), expect.stringContaining("upnext_composio_link=; Max-Age=0")]));
  });
});
