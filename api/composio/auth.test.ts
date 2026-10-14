// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./auth.js";

afterEach(() => vi.unstubAllGlobals());

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
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test", connected_account_id: "ca_owner" }), { status: 201 })));
    const { result, response } = responseRecorder();
    await handler({ method: "GET" } as never, response);
    expect(result.redirect).toBe("https://connect.composio.dev/link/ln_test");
    expect(result.headers["Set-Cookie"]).toContain("upnext_composio_link=ca_owner");
  });

  it("rejects a link response without a connected account ID", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ redirect_url: "https://connect.composio.dev/link/ln_test" }), { status: 201 })));
    const { result, response } = responseRecorder();
    await handler({ method: "GET" } as never, response);
    expect(result.redirect).toBe("/?calendar=failed");
    expect(result.headers["Set-Cookie"]).toBeUndefined();
  });
});
