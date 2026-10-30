export type AnalyticsConsent = "granted" | "denied";
// A new consent version is required because the previous choice covered Clarity alone.
export const ANALYTICS_CONSENT_KEY = "tinkleme.analytics-consent.v2";
const SCRIPT_ID = "tinkleme-clarity";
let posthogLoading: Promise<void> | null = null;
let posthogClient: typeof import("posthog-js").default | null = null;

type Clarity = ((...args: unknown[]) => void) & { q?: unknown[][] };
declare global {
  interface Window { clarity?: Clarity }
}

export function clarityIsConfigured(): boolean {
  return /^[a-z0-9]+$/i.test(import.meta.env.VITE_CLARITY_PROJECT_ID ?? "");
}

export function posthogIsConfigured(): boolean {
  return /^phc_[a-z0-9]+$/i.test(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN ?? "")
    && ["https://us.i.posthog.com", "https://eu.i.posthog.com"].includes(import.meta.env.VITE_POSTHOG_HOST ?? "");
}

export function posthogIsLoaded(): boolean { return posthogClient !== null; }

export function loadPostHog(): Promise<void> {
  if (!posthogIsConfigured() || readAnalyticsConsent() !== "granted") return Promise.resolve();
  if (posthogLoading) return posthogLoading;
  posthogLoading = import("posthog-js").then(({ default: posthog }) => {
    if (readAnalyticsConsent() !== "granted") { posthogLoading = null; return; }
    posthog.init(import.meta.env.VITE_POSTHOG_PROJECT_TOKEN, {
      api_host: import.meta.env.VITE_POSTHOG_HOST,
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      capture_heatmaps: false,
      capture_performance: false,
      disable_session_recording: true,
      disable_surveys: true,
      advanced_disable_feature_flags: true,
      person_profiles: "identified_only",
      persistence: "memory",
      before_send: (event) => event.event === "$pageview" ? {
        ...event,
        properties: { $current_url: `${window.location.origin}${window.location.pathname}` },
      } : null,
    });
    posthogClient = posthog;
    posthog.capture("$pageview", { $current_url: `${window.location.origin}${window.location.pathname}` });
  }).catch(() => { posthogLoading = null; });
  return posthogLoading;
}

export function readAnalyticsConsent(): AnalyticsConsent | null {
  // This fallback keeps revocation effective even when browser storage becomes unavailable.
  if (new URLSearchParams(window.location.search).get("analytics") === "off") return "denied";
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeAnalyticsConsent(consent: AnalyticsConsent): boolean {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, consent);
    const url = new URL(window.location.href);
    if (url.searchParams.has("analytics")) {
      url.searchParams.delete("analytics");
      window.history.replaceState(window.history.state, "", url);
    }
    return true;
  } catch {
    return false;
  }
}

export function loadClarity(): void {
  if (!clarityIsConfigured() || readAnalyticsConsent() !== "granted" || document.getElementById(SCRIPT_ID)) return;
  window.clarity ??= Object.assign((...args: unknown[]) => { window.clarity?.q?.push(args); }, { q: [] as unknown[][] });
  // Queue consent before requesting the script. Advertising storage is never enabled.
  window.clarity("consentv2", { analytics_Storage: "granted", ad_Storage: "denied" });
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.src = `https://www.clarity.ms/tag/${import.meta.env.VITE_CLARITY_PROJECT_ID}`;
  document.head.appendChild(script);
}

export function revokeClarity(reload: (url?: string) => void = (url) => url ? window.location.replace(url) : window.location.reload()): void {
  const saved = writeAnalyticsConsent("denied");
  const wasLoaded = Boolean(document.getElementById(SCRIPT_ID)) || posthogIsLoaded();
  posthogClient?.opt_out_capturing();
  window.clarity?.("consentv2", { analytics_Storage: "denied", ad_Storage: "denied" });
  // Clear both host-only and parent-domain first-party Clarity cookies.
  const hostParts = window.location.hostname.split(".");
  for (const name of ["_clck", "_clsk"]) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    for (let index = 0; index < hostParts.length - 1; index += 1) {
      document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${hostParts.slice(index).join(".")}; SameSite=Lax`;
    }
  }
  if (!wasLoaded) return;
  // Consent denial alone permits cookieless recording. A reload removes the runtime entirely.
  if (saved) reload();
  else {
    const url = new URL(window.location.href);
    url.searchParams.set("analytics", "off");
    reload(url.toString());
  }
}
