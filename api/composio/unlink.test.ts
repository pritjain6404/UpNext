// @vitest-environment node
import { beforeEach, expect, it } from "vitest";
import { accountCookie, connectedAccountIds } from "../_account-cookies.js";
import unlink from "./unlink.js";

function responseRecorder() {
  const result = { status: 200, body: undefined as unknown, cookie: "" };
  const response = {
    status(code: number) { result.status = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    setHeader(_name: string, value: string) { result.cookie = value; return this; },
  };
  return { result, response: response as never };
}

beforeEach(() => { process.env.COMPOSIO_API_KEY = "key"; });

it("removes only the failed browser-local Calendar connection", () => {
  const oldCookie = accountCookie("calendar", ["ca_first", "ca_stale", "ca_third"]).split(";")[0];
  const { result, response } = responseRecorder();
  unlink({ method: "POST", headers: { origin: "https://tinkleme.tech", host: "tinkleme.tech", cookie: oldCookie }, body: { service: "calendar", index: 2 } } as never, response);
  expect(result.status).toBe(200);
  expect(connectedAccountIds({ headers: { cookie: result.cookie.split(";")[0] } } as never, "calendar")).toEqual(["ca_first", "ca_third"]);
  expect(connectedAccountIds({ headers: { cookie: oldCookie } } as never, "calendar")).toEqual(["ca_first", "ca_stale", "ca_third"]);
});

it("rejects cross-origin unlink attempts", () => {
  const { result, response } = responseRecorder();
  unlink({ method: "POST", headers: { origin: "https://evil.test", host: "tinkleme.tech", cookie: accountCookie("tasks", ["ca_first"]).split(";")[0] }, body: { service: "tasks", index: 1 } } as never, response);
  expect(result.status).toBe(403);
  expect(result.cookie).toBe("");
});
