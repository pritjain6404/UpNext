// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY, loadClarity, loadPostHog, readAnalyticsConsent, revokeClarity, writeAnalyticsConsent } from "./analytics";

const posthog = vi.hoisted(() => ({ init: vi.fn(), capture: vi.fn(), opt_out_capturing: vi.fn() }));
vi.mock("posthog-js", () => ({ default: posthog }));

beforeEach(() => {
  vi.stubEnv("VITE_CLARITY_PROJECT_ID", "z5gtncufk3");
  vi.stubEnv("VITE_POSTHOG_PROJECT_TOKEN", "phc_testtoken");
  vi.stubEnv("VITE_POSTHOG_HOST", "https://us.i.posthog.com");
  vi.clearAllMocks();
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  });
  window.history.replaceState(null, "", "/");
  document.getElementById("tinkleme-clarity")?.remove();
  delete window.clarity;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  document.getElementById("tinkleme-clarity")?.remove();
  delete window.clarity;
});

it("does not request Clarity before a visitor opts in", () => {
  expect(readAnalyticsConsent()).toBeNull();
  loadClarity();
  expect(document.getElementById("tinkleme-clarity")).toBeNull();
});

it("loads Clarity once after consent and stops it after revocation", () => {
  expect(writeAnalyticsConsent("granted")).toBe(true);
  loadClarity();
  loadClarity();
  expect(document.querySelectorAll("#tinkleme-clarity")).toHaveLength(1);
  expect((document.getElementById("tinkleme-clarity") as HTMLScriptElement).src).toBe("https://www.clarity.ms/tag/z5gtncufk3");

  const reload = vi.fn();
  revokeClarity(reload);
  expect(readAnalyticsConsent()).toBe("denied");
  expect(reload).toHaveBeenCalledOnce();
});

it("never initializes PostHog before analytics consent", async () => {
  localStorage.setItem("tinkleme.analytics-consent.v1", "granted");
  expect(readAnalyticsConsent()).toBeNull();
  await loadPostHog();
  expect(posthog.init).not.toHaveBeenCalled();
});

it("captures only a sanitized pageview after consent", async () => {
  window.history.replaceState(null, "", "/?calendar=connected&secret=private");
  writeAnalyticsConsent("granted");
  await loadPostHog();
  expect(posthog.init).toHaveBeenCalledOnce();
  const options = posthog.init.mock.calls[0][1];
  expect(options).toMatchObject({ autocapture: false, capture_pageview: false, capture_pageleave: false, disable_session_recording: true });
  expect(options.before_send({ event: "$pageview", properties: { $current_url: window.location.href, secret: "private" } })).toMatchObject({ properties: { $current_url: window.location.origin + "/" } });
  expect(options.before_send({ event: "$autocapture", properties: {} })).toBeNull();
  expect(posthog.capture).toHaveBeenCalledWith("$pageview", { $current_url: window.location.origin + "/" });
  const reload = vi.fn();
  revokeClarity(reload);
  expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
  expect(reload).toHaveBeenCalledOnce();
});
