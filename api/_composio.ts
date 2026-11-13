import type { VercelRequest } from "@vercel/node";

const COMPOSIO_API = "https://backend.composio.dev/api/v3.1";

export function configured() {
  return Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_AUTH_CONFIG_ID && process.env.COMPOSIO_USER_ID && process.env.COMPOSIO_REDIRECT_URI);
}

export function tasksConfigured() {
  return Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_TASKS_AUTH_CONFIG_ID && process.env.COMPOSIO_USER_ID && process.env.COMPOSIO_TASKS_REDIRECT_URI);
}

export function redirectUri() {
  return process.env.COMPOSIO_REDIRECT_URI!;
}

export function cookie(req: VercelRequest, name: string) {
  return (req.headers.cookie ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
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
