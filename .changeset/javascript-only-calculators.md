---
"api": minor
"web": major
"@taxkit/analytics": major
"@taxkit/observability": major
"@taxkit/infrastructure": minor
---

The Website calculators now need JavaScript. The Website no longer accepts
HTML form POSTs and shows a notice when JavaScript is off; browsers keep
calling the public API directly.

The private Website forwarding key is removed with the server form path. The
API takes a calculation caller's rate key only from the direct Cloudflare
connection or the local emulator fallback. `@taxkit/observability/edge-identity`
no longer exports the forwarding headers or credential Schema, and the
`TaxKitWebsiteForwardingKey` resource leaves the native apps stack.

The unused Website analytics relay (`/ingest/e/`) and the browser's collection
header are removed, with the `@taxkit/analytics/relay/*` exports and the
`analytics-relay` host route. The API's own calculator analytics is unchanged.
