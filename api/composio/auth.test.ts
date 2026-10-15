// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./auth.js";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.UPNEXT_SESSION_SECRET; });

function responseRecorder() {
  const result = { redirect: "", headers: {} as Record<string, unknown> };
  const response = {
    redirect(location: string) { result.redirect = location; return this; },
    setHeader(name: string, value: unknown) { result.headers[name] = value; return this; },
  };
  return { result, response: response as never };
}

describe("Composio auth link", () => {
  it("binds the browser to the pending connected account", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback", UPNEXT_SESSION_SECRET: "a-long-test-secret-for-cookie-signing" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test", connected_account_id: "ca_owner" }), { status: 201 })));
    const { result, response } = responseRecorder();
    await handler({ method: "GET", headers: {} } as never, response);
    expect(result.redirect).toBe("https://connect.composio.dev/link/ln_test");
    expect(result.headers["Set-Cookie"]).toEqual(expect.arrayContaining([expect.stringContaining("upnext_composio_link=ca_owner")]));
  });

  it("creates a separate Composio identity for each browser", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback", UPNEXT_SESSION_SECRET: "a-long-test-secret-for-cookie-signing" });
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test", connected_account_id: "ca_owner" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = responseRecorder();
    const second = responseRecorder();
    await handler({ method: "GET", headers: {} } as never, first.response);
    await handler({ method: "GET", headers: {} } as never, second.response);
    const firstUser = JSON.parse(fetchMock.mock.calls[0][1].body).user_id;
    const secondUser = JSON.parse(fetchMock.mock.calls[1][1].body).user_id;
    expect(firstUser).toMatch(/^upnext-[a-f0-9-]{36}$/);
    expect(secondUser).not.toBe(firstUser);
    expect(first.result.headers["Set-Cookie"]).toEqual(expect.arrayContaining([expect.stringContaining("upnext_user=")]));
  });

  it("reuses the signed identity when the same browser reconnects", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback", UPNEXT_SESSION_SECRET: "a-long-test-secret-for-cookie-signing" });
    const fetchMock = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test", connected_account_id: "ca_owner" }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const first = responseRecorder();
    await handler({ method: "GET", headers: {} } as never, first.response);
    const userCookie = (first.result.headers["Set-Cookie"] as string[]).find((value) => value.startsWith("upnext_user="))!.split(";")[0];
    const second = responseRecorder();
    await handler({ method: "GET", headers: { cookie: userCookie } } as never, second.response);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).user_id).toBe(JSON.parse(fetchMock.mock.calls[0][1].body).user_id);
    expect(second.result.headers["Set-Cookie"]).toEqual([expect.stringContaining("upnext_composio_link=")]);
  });

  it("rejects a link response without a connected account ID", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback", UPNEXT_SESSION_SECRET: "a-long-test-secret-for-cookie-signing" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test" }), { status: 201 })));
    const { result, response } = responseRecorder();
    await handler({ method: "GET", headers: {} } as never, response);
    expect(result.redirect).toBe("/?calendar=failed");
    expect(result.headers["Set-Cookie"]).toBeUndefined();
  });
});
