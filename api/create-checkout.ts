import type { VercelRequest, VercelResponse } from "@vercel/node";

type CheckoutResponse = { checkout_url?: string; session_id?: string };

function getDodoHost() {
  return "https://test.dodopayments.com";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (process.env.DODO_PAYMENTS_ENVIRONMENT !== "test_mode") {
    return res.status(503).json({ error: "Only Dodo test checkout is available." });
  }

  const apiKey = process.env.DODO_PAYMENTS_API_KEY;
  const productId = process.env.DODO_PAYMENTS_PRODUCT_ID;
  if (!apiKey || !productId) {
    return res.status(503).json({ error: "Dodo Payments is not configured on this deployment." });
  }

  const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL;
  const cancelUrl = process.env.DODO_PAYMENTS_CANCEL_URL;
  if (!returnUrl || !cancelUrl) {
    return res.status(503).json({ error: "Dodo Payments return URLs are not configured on this deployment." });
  }

  try {
    const response = await fetch(`${getDodoHost()}/checkouts`, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        return_url: returnUrl,
        cancel_url: cancelUrl,
      }),
    });

    const payload = (await response.json()) as CheckoutResponse & { message?: string };
    if (!response.ok || !payload.checkout_url) {
      return res.status(502).json({ error: payload.message ?? "Dodo Payments could not create a checkout session." });
    }

    return res.status(200).json({ checkout_url: payload.checkout_url, session_id: payload.session_id });
  } catch {
    return res.status(502).json({ error: "Dodo Payments is temporarily unavailable. Please try again." });
  }
}
