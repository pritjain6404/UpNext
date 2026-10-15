import type { VercelRequest } from "@vercel/node";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const COMPOSIO_API = "https://backend.composio.dev/api/v3.1";

export function configured() {
  return Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_AUTH_CONFIG_ID && process.env.COMPOSIO_REDIRECT_URI && process.env.UPNEXT_SESSION_SECRET);
}

export function redirectUri() {
  return process.env.COMPOSIO_REDIRECT_URI!;
}

export function cookie(req: VercelRequest, name: string) {
  const value = (req.headers.cookie ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
  try { return value ? decodeURIComponent(value) : undefined; } catch { return undefined; }
}

function signature(id: string) {
  return createHmac("sha256", process.env.UPNEXT_SESSION_SECRET!).update(id).digest("hex");
}

export function newBrowserUser() {
  const id = randomUUID();
  return { id: `upnext-${id}`, token: `${id}.${signature(id)}` };
}

export function browserUser(req: VercelRequest) {
  if (!process.env.UPNEXT_SESSION_SECRET) return null;
  const token = cookie(req, "upnext_user");
  if (!token) return null;
  const [id, mac] = token.split(".");
  if (!id || !/^[a-f0-9-]{36}$/.test(id) || !mac || !/^[a-f0-9]{64}$/.test(mac)) return null;
  const expected = Uint8Array.from(Buffer.from(signature(id), "hex"));
  if (!timingSafeEqual(expected, Uint8Array.from(Buffer.from(mac, "hex")))) return null;
  return { id: `upnext-${id}`, token };
}

export function cookieHeader(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function composioFetch(path: string, init: RequestInit) {
  return fetch(`${COMPOSIO_API}${path}`, {
    ...init,
    signal: init.signal ?? AbortSignal.timeout(10_000),
    headers: {
      "x-api-key": process.env.COMPOSIO_API_KEY!,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export { COMPOSIO_API };
