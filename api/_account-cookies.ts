import { createHmac, timingSafeEqual } from "node:crypto";
import type { VercelRequest } from "@vercel/node";
import { cookie, cookieHeader } from "./_composio.js";

type Service = "calendar" | "tasks";
const accountIdPattern = /^ca_[A-Za-z0-9_-]+$/;
const maxAccounts = 4;

export function isConnectedAccountId(value: string) {
  return accountIdPattern.test(value);
}

function cookieName(service: Service) {
  return `upnext_${service}_accounts`;
}

function signature(service: Service, purpose: "accounts" | "pending", encoded: string) {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("Composio is not configured.");
  return createHmac("sha256", key).update(`upnext:${service}:${purpose}:v1:${encoded}`).digest("base64url");
}

function signedValue(req: VercelRequest, service: Service, purpose: "accounts" | "pending", name: string) {
  const raw = cookie(req, name);
  if (!raw) return null;
  const [encoded, provided, extra] = raw.split(".");
  if (!encoded || !provided || extra) return null;
  const expected = Uint8Array.from(Buffer.from(signature(service, purpose, encoded)));
  const actual = Uint8Array.from(Buffer.from(provided));
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  return encoded;
}

export function connectedAccountIds(req: VercelRequest, service: Service): string[] {
  const encoded = signedValue(req, service, "accounts", cookieName(service));
  if (!encoded) return [];
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as { v?: number; ids?: unknown };
    if (payload.v !== 1 || !Array.isArray(payload.ids) || payload.ids.length > maxAccounts || !payload.ids.every((id) => typeof id === "string" && isConnectedAccountId(id))) return [];
    return [...new Set(payload.ids)];
  } catch {
    return [];
  }
}

export function accountCookie(service: Service, ids: string[]) {
  const unique = [...new Set(ids)].filter(isConnectedAccountId).slice(-maxAccounts);
  const encoded = Buffer.from(JSON.stringify({ v: 1, ids: unique })).toString("base64url");
  return cookieHeader(cookieName(service), `${encoded}.${signature(service, "accounts", encoded)}`, 60 * 60 * 24 * 30);
}

function pendingName(service: Service) {
  return service === "calendar" ? "upnext_composio_link" : "upnext_tasks_link";
}

export function pendingLinkCookie(service: Service, accountId: string) {
  if (!isConnectedAccountId(accountId)) throw new Error("Invalid account ID.");
  return cookieHeader(pendingName(service), `${accountId}.${signature(service, "pending", accountId)}`, 10 * 60);
}

export function pendingLinkAccountId(req: VercelRequest, service: Service) {
  const accountId = signedValue(req, service, "pending", pendingName(service));
  return accountId && isConnectedAccountId(accountId) ? accountId : null;
}
