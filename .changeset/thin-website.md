---
"@taxkit/api-http": minor
"@taxkit/calculators": minor
---

The HTTP package now owns the generated client's named reads
(`@taxkit/api-http/requests`, with `boundedReplies` and a ten-second deadline),
their transport errors (`@taxkit/api-http/errors`) and `Accept` negotiation
(`@taxkit/api-http/negotiation`). The calculators package owns the browser
calculator page: its forms (`./form`), page state (`./page`), view and tool
failure Schemas (`./page-schemas`) and page tools (`./page-tools`). The new
private `@taxkit/webmcp` package registers those tools with the browser's
WebMCP host.
