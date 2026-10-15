// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { browserUser, newBrowserUser } from "./_composio.js";

afterEach(() => { delete process.env.UPNEXT_SESSION_SECRET; });

describe("browser-specific calendar identity", () => {
  it("restores only a correctly signed browser identity", () => {
    process.env.UPNEXT_SESSION_SECRET = "a-long-test-secret-for-cookie-signing";
    const user = newBrowserUser();
    expect(browserUser({ headers: { cookie: `upnext_user=${user.token}` } } as never)?.id).toBe(user.id);
    const tampered = `${user.token.slice(0, -1)}${user.token.endsWith("0") ? "1" : "0"}`;
    expect(browserUser({ headers: { cookie: `upnext_user=${tampered}` } } as never)).toBeNull();
    expect(browserUser({ headers: { cookie: "upnext_user=upnext-owner" } } as never)).toBeNull();
  });
});
