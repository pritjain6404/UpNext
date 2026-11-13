// @vitest-environment node
import { createHmac } from "node:crypto";
import { Readable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import handler, { PayloadTooLargeError, readRawBody, verifyDodoWebhook } from "../../../api/dodo/webhook.js";

const secret = `whsec_${Buffer.from("test-secret").toString("base64")}`;

afterEach(() => { delete process.env.DODO_PAYMENTS_WEBHOOK_KEY; });

function responseRecorder() {
  const result = { statusCode: 200, body: undefined as unknown, headers: {} as Record<string, unknown> };
  const response = {
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    setHeader(name: string, value: unknown) { result.headers[name] = value; return this; },
  };
  return { result, response: response as never };
}

function signedHeaders(body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const id = "msg_test";
  const signature = createHmac("sha256", "test-secret")
    .update(`${id}.${timestamp}.${body}`)
    .digest("base64");
  return {
    "webhook-id": id,
    "webhook-timestamp": String(timestamp),
    "webhook-signature": `v1,${signature}`,
  };
}

describe("verifyDodoWebhook", () => {
  it("accepts an authentic, recent Standard Webhooks delivery", () => {
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });
    expect(verifyDodoWebhook(body, signedHeaders(body), secret)).toMatchObject({
      type: "payment.succeeded",
      data: { payment_id: "pay_123" },
    });
  });

  it("rejects a tampered delivery", () => {
    const original = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });
    const tampered = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_999" } });
    expect(() => verifyDodoWebhook(tampered, signedHeaders(original), secret)).toThrow("Invalid webhook signature.");
  });

  it("rejects stale deliveries", () => {
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });
    const stale = Math.floor(Date.now() / 1000) - 10 * 60;
    expect(() => verifyDodoWebhook(body, signedHeaders(body, stale), secret)).toThrow("Webhook timestamp is outside the allowed window.");
  });

  it("rejects an oversized body while streaming", async () => {
    const request = Object.assign(Readable.from([Buffer.alloc(1024 * 1024 + 1)]), { headers: {} }) as never;
    await expect(readRawBody(request)).rejects.toBeInstanceOf(PayloadTooLargeError);
  });

  it("keeps successful payments retryable until fulfillment exists", async () => {
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = secret;
    const body = JSON.stringify({ type: "payment.succeeded", data: { payment_id: "pay_123" } });
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: signedHeaders(body), body } as never, response);
    expect(result.statusCode).toBe(503);
  });

  it("acknowledges an authentic non-payment event", async () => {
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = secret;
    const body = JSON.stringify({ type: "customer.created", data: { customer_id: "cus_123" } });
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: signedHeaders(body), body } as never, response);
    expect(result).toMatchObject({ statusCode: 200, body: { received: true } });
  });

  it("rejects an invalid delivery at the handler boundary", async () => {
    process.env.DODO_PAYMENTS_WEBHOOK_KEY = secret;
    const { result, response } = responseRecorder();
    await handler({ method: "POST", headers: {}, body: "{}" } as never, response);
    expect(result.statusCode).toBe(401);
  });
});
