---
"taxkit": patch
"api": patch
"web": patch
"@taxkit/api-http": patch
"@taxkit/infrastructure": patch
"@taxkit/mdx": patch
"@taxkit/og-image": patch
---

Update Effect to 4.0.7 and Alchemy to beta.84, migrate the Cloudflare, Axiom and Doppler providers to their separate packages, and preserve the existing deployment identities. Keep telemetry authorization redacted through native planning and state migration.

Keep the Website build hash focused on real workspace inputs, adopt the native redirect provider's refusal to write after a failed ruleset read, and regenerate OpenAPI with flattened unions and optional query parameters represented by omission rather than null.

Use Alchemy's supported Node loader for local development and persist standalone native test bundles explicitly. Preserve HTTP 500 for internal Website faults and mismatched pages, while unavailable page reads retain their intended HTTP 503 through the updated TanStack error renderer.

Refresh the remaining application, rendering, browser-test and development dependencies, including the native TypeScript compiler diagnostics and the SDK assembler's JavaScript compiler API.
