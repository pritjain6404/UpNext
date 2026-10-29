// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../../api/create-checkout.js";

afterEach(() => {
  delete process.env.VERCEL_ENV;
  delete process.env.DODO_PAYMENTS_ENVIRONMENT;
  delete process.env.DODO_PAYMENTS_API_KEY;
  delete process.env.DODO_PAYMENTS_PRODUCT_ID;
  delete process.env.DODO_PAYMENTS_RETURN_URL;
  delete process.env.DODO_PAYMENTS_CANCEL_URL;
  vi.unstubAllGlobals();
});

function responseRecorder() {
  const result = { statusCode: 200, body: undefined as unknown, headers: {} as Record<string, unknown> };
  const response = {
    status(code: number) { result.statusCode = code; return this; },
    json(body: unknown) { result.body = body; return this; },
    setHeader(name: string, value: unknown) { result.headers[name] = value; return this; },
  };
  return { result, response: response as never };
}

describe("create checkout", () => {
  it("does not offer even test checkout on Production", async () => {
    process.env.VERCEL_ENV = "production";
    process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
    process.env.DODO_PAYMENTS_API_KEY = "test-key";
    process.env.DODO_PAYMENTS_PRODUCT_ID = "prod_test";
    process.env.DODO_PAYMENTS_RETURN_URL = "https://example.com/?checkout=success";
    process.env.DODO_PAYMENTS_CANCEL_URL = "https://example.com/?checkout=cancelled";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result, response } = responseRecorder();
    await handler({ method: "POST" } as never, response);

    expect(result.statusCode).toBe(503);
    expect(result.body).toEqual({ error: "Checkout is not available on Production." });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses live checkout while UpNext only supports test checkout", async () => {
    process.env.DODO_PAYMENTS_ENVIRONMENT = "live_mode";
    process.env.DODO_PAYMENTS_API_KEY = "live-key";
    process.env.DODO_PAYMENTS_PRODUCT_ID = "prod_live";
    process.env.DODO_PAYMENTS_RETURN_URL = "https://example.com/?checkout=success";
    process.env.DODO_PAYMENTS_CANCEL_URL = "https://example.com/?checkout=cancelled";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result, response } = responseRecorder();
    await handler({ method: "POST" } as never, response);

    expect(result.statusCode).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a session only on Dodo's test host", async () => {
    process.env.DODO_PAYMENTS_ENVIRONMENT = "test_mode";
    process.env.DODO_PAYMENTS_API_KEY = "test-key";
    process.env.DODO_PAYMENTS_PRODUCT_ID = "prod_test";
    process.env.DODO_PAYMENTS_RETURN_URL = "https://example.com/?checkout=success";
    process.env.DODO_PAYMENTS_CANCEL_URL = "https://example.com/?checkout=cancelled";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ checkout_url: "https://test.dodopayments.com/checkout/123", session_id: "ses_123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, response } = responseRecorder();
    await handler({ method: "POST" } as never, response);

    expect(result).toMatchObject({ statusCode: 200, body: { checkout_url: "https://test.dodopayments.com/checkout/123" } });
    expect(fetchMock.mock.calls[0][0]).toBe("https://test.dodopayments.com/checkouts");
  });
});
