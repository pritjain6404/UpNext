// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { loadCalendarEvents, ownsConnectedAccount } from "./events.js";

describe("Composio calendar contract", () => {
  it("executes the documented tool path and normalizes timed and all-day events", async () => {
    process.env.COMPOSIO_USER_ID = "owner";
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
    expect(JSON.parse(request.mock.calls[0][1].body)).toMatchObject({ connected_account_id: "ca_owner", user_id: "owner", version: "latest", arguments: { calendarId: "primary" } });
  });

  it("rejects an HTTP 200 tool failure", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ successful: false, error: "provider failed" }), { status: 200 }));
    await expect(loadCalendarEvents("ca_owner", 0, request)).rejects.toThrow("provider failed");
  });

  it("requires an active account owned by the configured user", async () => {
    process.env.COMPOSIO_USER_ID = "owner";
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({ user_id: "other", status: "ACTIVE" }), { status: 200 }));
    await expect(ownsConnectedAccount("ca_other", request)).resolves.toBe(false);
    expect(request).not.toHaveBeenCalledWith(expect.stringContaining("bad/account"), expect.anything());
    await expect(ownsConnectedAccount("bad/account", request)).resolves.toBe(false);
  });

  it("keeps transient account lookup failures retryable", async () => {
    const request = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    await expect(ownsConnectedAccount("ca_owner", request)).rejects.toThrow("account lookup failed");
  });
});
