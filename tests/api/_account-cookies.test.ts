// @vitest-environment node
import { describe, expect, it } from "vitest";
import { accountCookie, connectedAccountIds, pendingLinkAccountId, pendingLinkCookie } from "../../api/_account-cookies.js";

function request(value?: string) {
  return { headers: { cookie: value ? `upnext_calendar_accounts=${value}` : "" } } as never;
}

describe("connected account cookies", () => {
  it("retains two accounts connected by the same browser", () => {
    process.env.COMPOSIO_API_KEY = "test-key";
    const first = accountCookie("calendar", ["ca_first"]);
    const firstValue = first.match(/^upnext_calendar_accounts=([^;]+)/)?.[1];
    const second = accountCookie("calendar", [...connectedAccountIds(request(firstValue), "calendar"), "ca_second"]);
    const secondValue = second.match(/^upnext_calendar_accounts=([^;]+)/)?.[1];
    expect(connectedAccountIds(request(secondValue), "calendar")).toEqual(["ca_first", "ca_second"]);
  });

  it("rejects a changed account id rather than exposing another account", () => {
    process.env.COMPOSIO_API_KEY = "test-key";
    const signed = accountCookie("calendar", ["ca_first"]).match(/^upnext_calendar_accounts=([^;]+)/)?.[1] ?? "";
    const [encoded, signature] = signed.split(".");
    const changed = Buffer.from(Buffer.from(encoded, "base64url").toString("utf8").replace("ca_first", "ca_other")).toString("base64url");
    expect(connectedAccountIds(request(`${changed}.${signature}`), "calendar")).toEqual([]);
  });

  it("does not mix Calendar and Tasks connections", () => {
    process.env.COMPOSIO_API_KEY = "test-key";
    const signed = accountCookie("tasks", ["ca_tasks"]).match(/^upnext_tasks_accounts=([^;]+)/)?.[1] ?? "";
    expect(connectedAccountIds({ headers: { cookie: `upnext_calendar_accounts=${signed}` } } as never, "calendar")).toEqual([]);
  });

  it("rejects a forged OAuth callback marker even when its account belongs to the shared Composio user", () => {
    process.env.COMPOSIO_API_KEY = "test-key";
    expect(pendingLinkAccountId({ headers: { cookie: "upnext_composio_link=ca_other" } } as never, "calendar")).toBeNull();
    const valid = pendingLinkCookie("calendar", "ca_first").split(";")[0];
    expect(pendingLinkAccountId({ headers: { cookie: valid } } as never, "calendar")).toBe("ca_first");
  });
});
