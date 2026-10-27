// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { loadCalendarEvents, ownsConnectedAccount, serveCalendarEvents } from "./events.js";
import { accountCookie } from "../_account-cookies.js";

describe("Composio calendar contract", () => {
  it("executes the documented tool path and normalizes timed and all-day events", async () => {
    process.env.COMPOSIO_USER_ID = "owner";
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      successful: true,
      data: { events: [
        { source_calendar_id: "work", source_calendar_summary: "Work", event: { id: "timed", summary: "Meeting", start: { dateTime: "2026-10-14T10:00:00Z" } } },
        { source_calendar_id: "home", source_calendar_summary: "Home", event: { id: "all-day", summary: "Holiday", start: { date: "2026-10-15" }, end: { date: "2026-10-16" } } },
      ] },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(loadCalendarEvents("ca_owner", 0, request)).resolves.toEqual({ events: [
      { id: "work:timed", title: "Meeting", startsAt: "2026-10-14T10:00:00Z", endsAt: undefined, calendar: "Work" },
      { id: "home:all-day", title: "Holiday", startsAt: "2026-10-15", endsAt: "2026-10-16", calendar: "Home" },
    ], failedCalendars: 0 });
    expect(request).toHaveBeenCalledWith("/tools/execute/GOOGLECALENDAR_EVENTS_LIST_ALL_CALENDARS", expect.objectContaining({ method: "POST" }));
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ connected_account_id: "ca_owner", user_id: "owner", version: "latest", arguments: { response_detail: "full", single_events: true } });
  });

  it("rejects an HTTP 200 tool failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: false, error: "provider failed" }), { status: 200 }));
    await expect(loadCalendarEvents("ca_owner", 0, request)).rejects.toThrow("provider failed");
  });

  it("keeps healthy events when one calendar fails", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: true, data: {
      events: [{ source_calendar_id: "work", event: { id: "one", summary: "Meeting", start: { date: "2026-10-20" } } }],
      errors_by_calendar: { broken: "Access denied" },
    } }), { status: 200 }));
    await expect(loadCalendarEvents("ca_owner", 0, request)).resolves.toMatchObject({ failedCalendars: 1, events: [{ title: "Meeting" }] });
  });

  it("requires an active account owned by the configured user", async () => {
    process.env.COMPOSIO_USER_ID = "owner";
    process.env.COMPOSIO_AUTH_CONFIG_ID = "ac_calendar";
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "other", status: "ACTIVE", auth_config: { id: "ac_calendar" } }), { status: 200 }));
    await expect(ownsConnectedAccount("ca_other", request)).resolves.toBe(false);
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("bad/account"), expect.anything());
    await expect(ownsConnectedAccount("bad/account", request)).resolves.toBe(false);
  });

  it("keeps transient account lookup failures retryable", async () => {
    const request = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(ownsConnectedAccount("ca_owner", request)).rejects.toThrow("account lookup failed");
  });

  it("merges events from the two accounts connected in this browser", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "ac_calendar", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/callback" });
    const cookie = accountCookie("calendar", ["ca_first", "ca_second"]).split(";")[0];
    const request = vi.fn(async (path: string, init: RequestInit) => path.startsWith("/connected_accounts/")
      ? new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "ac_calendar" } }), { status: 200 })
      : new Response(JSON.stringify({ successful: true, data: { events: [{ source_calendar_id: "primary", event: { id: "one", summary: JSON.parse(init.body as string).connected_account_id, start: { date: "2026-10-20" } } }] } }), { status: 200 }));
    const result = { status: 0, body: undefined as unknown };
    const res = { status(code: number) { result.status = code; return this; }, json(body: unknown) { result.body = body; return this; } } as never;
    await serveCalendarEvents({ method: "GET", headers: { cookie } } as never, res, request);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ events: [{ title: "ca_first", account: "Account 1" }, { title: "ca_second", account: "Account 2" }] });
  });

  it("returns healthy events and identifies the failed account for removal", async () => {
    Object.assign(process.env, { COMPOSIO_API_KEY: "key", COMPOSIO_AUTH_CONFIG_ID: "ac_calendar", COMPOSIO_USER_ID: "owner", COMPOSIO_REDIRECT_URI: "https://example.test/callback" });
    const cookie = accountCookie("calendar", ["ca_stale", "ca_healthy"]).split(";")[0];
    const request = vi.fn(async (path: string) => path === "/connected_accounts/ca_stale"
      ? new Response(JSON.stringify({ user_id: "owner", status: "EXPIRED", auth_config: { id: "ac_calendar" } }), { status: 200 })
      : path.startsWith("/connected_accounts/")
        ? new Response(JSON.stringify({ user_id: "owner", status: "ACTIVE", auth_config: { id: "ac_calendar" } }), { status: 200 })
        : new Response(JSON.stringify({ successful: true, data: { events: [{ source_calendar_id: "primary", event: { id: "one", summary: "Available", start: { date: "2026-10-20" } } }], errors_by_calendar: { hidden: "No access" } } }), { status: 200 }));
    const result = { status: 0, body: undefined as unknown };
    const res = { status(code: number) { result.status = code; return this; }, json(body: unknown) { result.body = body; return this; } } as never;
    await serveCalendarEvents({ method: "GET", headers: { cookie } } as never, res, request);
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ events: [{ title: "Available", account: "Account 2" }], failedAccounts: 1, failedAccountIndices: [1], failedCalendars: 1 });
  });
});
