// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler, { loadCalendarEvents, ownsConnectedAccount } from "./events.js";
import { newBrowserUser } from "../_composio.js";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.UPNEXT_SESSION_SECRET; });

function responseRecorder() {
  const result = { statusCode: 200, body: undefined as unknown };
  const response = {
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
  };
  return { result, response: response as never };
}

describe("Composio calendar contract", () => {
  it("executes the documented tool path and normalizes timed and all-day events", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      successful: true,
      data: { items: [
        { id: "timed", summary: "Meeting", start: { dateTime: "2026-10-14T10:00:00Z" } },
        { id: "all-day", summary: "Holiday", start: { date: "2026-10-15" }, end: { date: "2026-10-16" } },
      ] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(loadCalendarEvents("ca_owner", 0, request)).resolves.toEqual([
      { id: "timed", title: "Meeting", startsAt: "2026-10-14T10:00:00Z", endsAt: undefined },
      { id: "all-day", title: "Holiday", startsAt: "2026-10-15", endsAt: "2026-10-16" },
    ]);
    expect(request).toHaveBeenCalledWith("/tools/execute/GOOGLECALENDAR_EVENTS_LIST", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ connected_account_id: "ca_owner", version: "latest", arguments: { calendar_id: "primary" } });
  });

  it("rejects an HTTP 200 tool failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: false, error: "provider failed" }), { status: 200 }));
    await expect(loadCalendarEvents("ca_owner", 0, request)).rejects.toThrow("provider failed");
  });

  it("requires an active account owned by the configured user", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "other", status: "ACTIVE" }), { status: 200 }));
    await expect(ownsConnectedAccount("ca_other", "owner", request)).resolves.toBe(false);
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("bad/account"), expect.anything());
    await expect(ownsConnectedAccount("bad/account", "owner", request)).resolves.toBe(false);
  });

  it("keeps transient account lookup failures retryable", async () => {
    const request = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(ownsConnectedAccount("ca_owner", "owner", request)).rejects.toThrow("account lookup failed");
  });

  it("returns calendar events only to the browser that owns the connected account", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "config", COMPOSIO_REDIRECT_URI: "https://example.test/api/composio/callback", UPNEXT_SESSION_SECRET: "a-long-test-secret-for-cookie-signing" });
    const owner = newBrowserUser();
    const visitor = newBrowserUser();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user_id: owner.id, status: "ACTIVE" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ successful: true, data: { items: [{ id: "private", summary: "Private event", start: { dateTime: "2026-10-20T10:00:00Z" } }] } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user_id: owner.id, status: "ACTIVE" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const ownerResponse = responseRecorder();
    await handler({ method: "GET", headers: { cookie: `upnext_user=${owner.token}; upnext_composio_account=ca_owner` } } as never, ownerResponse.response);
    expect(ownerResponse.result.statusCode).toBe(200);
    expect(ownerResponse.result.body).toMatchObject({ events: [{ id: "private", title: "Private event" }] });

    const visitorResponse = responseRecorder();
    await handler({ method: "GET", headers: { cookie: `upnext_user=${visitor.token}; upnext_composio_account=ca_owner` } } as never, visitorResponse.response);
    expect(visitorResponse.result.statusCode).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const noIdentity = responseRecorder();
    await handler({ method: "GET", headers: { cookie: "upnext_composio_account=ca_owner" } } as never, noIdentity.response);
    expect(noIdentity.result.statusCode).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
