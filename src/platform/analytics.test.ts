// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ANALYTICS_CONSENT_KEY, loadClarity, readAnalyticsConsent, revokeClarity, writeAnalyticsConsent } from "./analytics";

beforeEach(() => {
  vi.stubEnv("VITE_CLARITY_PROJECT_ID", "z5gtncufk3");
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
