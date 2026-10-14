import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Webhook } from "standardwebhooks";

type Headers = Record<string, string | string[] | undefined>;
type DodoEvent = { type: string; data: Record<string, unknown> };

function header(headers: Headers, name: string) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function verifyDodoWebhook(rawBody: string, headers: Headers, secret: string): DodoEvent {
  const id = header(headers, "webhook-id");
  const timestamp = header(headers, "webhook-timestamp");
  const signatureHeader = header(headers, "webhook-signature");
  if (!id || !timestamp || !signatureHeader) throw new Error("Missing webhook signature headers.");
  let event: Partial<DodoEvent>;
  try {
    event = new Webhook(secret).verify(rawBody, {
      "webhook-id": id,
      "webhook-timestamp": timestamp,
      "webhook-signature": signatureHeader,
    }) as Partial<DodoEvent>;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.toLowerCase().includes("timestamp")) throw new Error("Webhook timestamp is outside the allowed window.");
    throw new Error("Invalid webhook signature.");
  }
  if (!event.type || !event.data || typeof event.data !== "object") throw new Error("Invalid webhook payload.");
  return event as DodoEvent;
}

const MAX_WEBHOOK_BYTES = 1024 * 1024;

export class PayloadTooLargeError extends Error {}

export async function readRawBody(req: VercelRequest) {
  const declaredLength = Number(header(req.headers, "content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) throw new PayloadTooLargeError();
  if (typeof req.body === "string") {
    if (Buffer.byteLength(req.body) > MAX_WEBHOOK_BYTES) throw new PayloadTooLargeError();
    return req.body;
  }
  if (Buffer.isBuffer(req.body)) {
    if (req.body.byteLength > MAX_WEBHOOK_BYTES) throw new PayloadTooLargeError();
    return req.body.toString("utf8");
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.byteLength;
    if (total > MAX_WEBHOOK_BYTES) throw new PayloadTooLargeError();
    chunks.push(new Uint8Array(bytes.buffer as ArrayBuffer, bytes.byteOffset, bytes.byteLength));
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!secret) return res.status(503).json({ error: "Dodo webhook verification is not configured." });
  try {
    const body = await readRawBody(req);
    const event = verifyDodoWebhook(body, req.headers, secret);
    if (event.type === "payment.succeeded") {
      return res.status(503).json({ error: "Payment fulfillment is not configured yet." });
    }
    return res.status(200).json({ received: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) return res.status(413).json({ error: "Webhook payload is too large." });
    return res.status(401).json({ error: "Invalid webhook delivery." });
  }
}
