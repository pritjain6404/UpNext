import { createCipheriv, createDecipheriv, createHash, createSecretKey, randomBytes } from "node:crypto";
import type { VercelRequest } from "@vercel/node";

const GOOGLE_AUTH = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";
const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

function key() {
  const secret = process.env.GOOGLE_OAUTH_SECRET;
  if (!secret) throw new Error("GOOGLE_OAUTH_SECRET is not configured.");
  return createSecretKey(new Uint8Array(createHash("sha256").update(secret).digest()));
}

export function configured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_OAUTH_SECRET);
}

export function callbackUrl(req: VercelRequest) {
  return process.env.GOOGLE_REDIRECT_URI ?? `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers.host}/api/google/callback`;
}

export function encode(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), new Uint8Array(iv) as Uint8Array<ArrayBuffer>);
  const encrypted = cipher.update(value, "utf8", "base64url") + cipher.final("base64url");
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted}`;
}

export function decode(value?: string) {
  if (!value) return null;
  try {
    const [iv, tag, encrypted] = value.split(".").map((part) => Buffer.from(part, "base64url"));
    const decipher = createDecipheriv("aes-256-gcm", key(), new Uint8Array(iv) as Uint8Array<ArrayBuffer>);
    decipher.setAuthTag(new Uint8Array(tag) as Uint8Array<ArrayBuffer>);
    return decipher.update(new Uint8Array(encrypted) as Uint8Array<ArrayBuffer>, undefined, "utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

export function cookie(req: VercelRequest, name: string) {
  const header = req.headers.cookie ?? "";
  return header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function serializeCookie(name: string, value: string, maxAge: number) {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function googleAuthUrl(req: VercelRequest, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callbackUrl(req),
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    state,
  });
  return `${GOOGLE_AUTH}?${params}`;
}

export async function exchangeCode(req: VercelRequest, code: string) {
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callbackUrl(req),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) throw new Error("Google authorization failed.");
  return (await response.json()) as { refresh_token?: string; access_token?: string };
}

export async function accessToken(refreshToken: string) {
  const response = await fetch(GOOGLE_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Google access token refresh failed.");
  return ((await response.json()) as { access_token: string }).access_token;
}

export { CALENDAR_API };
