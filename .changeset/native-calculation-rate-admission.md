---
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/api-rpc": major
"@taxkit/sdk": major
"@taxkit/docs-content": patch
---

Add canonical checked rate-limit and admission-unavailable calculation errors.
The native API shares 60 calculations per minute per checked connection address
across HTTP, RPC and private Website calls, including each batch member. HTTP
uses 429 with Retry-After 60 or fixed 503 guidance; RPC revision 4 preserves the
same errors. Metadata, direct engine/local SDK and standalone Bun work retain
their existing policy. Declare required native namespace configuration and
explicit bounded local emulation. Update generated/public error contracts.
No automatic calculation retry, provider apply, versioning or publication.
