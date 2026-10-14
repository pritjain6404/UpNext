# Dodo Payments setup

UpNext uses Dodo Payments Checkout Sessions. The browser calls the Vercel function at
`/api/create-checkout`; the function creates a fresh hosted checkout session with the
server-side API key and redirects the customer to Dodo's checkout.

## Configure Vercel

Create a product in the Dodo dashboard, then add these environment variables to the
Vercel project:

- `VITE_DODO_PRODUCT_ID`: the product ID used to show the upgrade action in the UI.
- `DODO_PAYMENTS_PRODUCT_ID`: the same product ID, read only by the server function.
- `DODO_PAYMENTS_API_KEY`: a test-mode key while validating the integration.
- `DODO_PAYMENTS_ENVIRONMENT`: `test_mode` or `live_mode`.
- `DODO_PAYMENTS_RETURN_URL`: the HTTPS URL followed by `?checkout=success`.
- `DODO_PAYMENTS_CANCEL_URL`: the HTTPS URL followed by `?checkout=cancelled`.
- `DODO_PAYMENTS_WEBHOOK_KEY`: the signing secret for `/api/dodo/webhook`.

The API key must never use a `VITE_` prefix and must not be committed. Add webhook
verification and entitlement persistence before treating a successful redirect as
proof of access; Dodo webhooks are the source of truth for fulfillment.
Both return URLs are required by the server function; it does not trust request
origins or hosts as redirect destinations.

The integration intentionally keeps payment credentials server-side and uses Dodo's
hosted checkout rather than collecting card details in UpNext.

## Webhook safety

Create a Dodo webhook for
`https://pritjain6404-probable-system.vercel.app/api/dodo/webhook` and copy its
signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`. The endpoint verifies Dodo's
Standard Webhooks signature and timestamp against the unmodified request body.

Successful-payment deliveries intentionally return `503` until authenticated
accounts and durable entitlement storage are added. This prevents a payment
from being acknowledged without actually granting the purchased access. Do not
enable the production webhook until that fulfillment work is complete.
