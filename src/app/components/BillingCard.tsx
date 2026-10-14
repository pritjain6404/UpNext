import { useState } from "react";

export function BillingCard() {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const checkoutState = new URLSearchParams(window.location.search).get("checkout");
  const configured = Boolean(import.meta.env.VITE_DODO_PRODUCT_ID);

  async function openCheckout() {
    setStatus(null);
    setIsLoading(true);
    try {
      const response = await fetch("/api/create-checkout", { method: "POST" });
      const payload = (await response.json()) as { checkout_url?: string; error?: string };
      if (!response.ok || !payload.checkout_url) {
        setStatus(payload.error ?? "Checkout could not be started.");
        return;
      }
      window.location.assign(payload.checkout_url);
    } catch {
      setStatus("Checkout could not be reached. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="billing card" aria-labelledby="billing-title">
      <div>
        <p className="eyebrow">UPNEXT PRO</p>
        <h2 id="billing-title">Keep more commitments in view.</h2>
        <p className="muted">Unlock the full reminder workspace with a secure Dodo Payments checkout.</p>
      </div>
      {checkoutState === "success" && <p className="checkout-note" role="status">Checkout returned. Payment confirmation is handled by Dodo webhook fulfillment.</p>}
      {checkoutState === "cancelled" && <p className="checkout-note" role="status">Checkout cancelled. No payment was taken.</p>}
      {status && <p className="errors" role="alert">{status}</p>}
      <button type="button" className="secondary" onClick={openCheckout} disabled={!configured || isLoading}>
        {!configured ? "Payments setup required" : isLoading ? "Opening secure checkout…" : "Upgrade with Dodo Payments"}
      </button>
      {!configured && <small className="muted">Set the public product ID and server-side Dodo credentials before enabling checkout.</small>}
    </section>
  );
}
