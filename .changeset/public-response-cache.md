---
"@taxkit/api-http": minor
---

Add `@taxkit/api-http/response-policy`: TaxKit's single public cache decision.
Successful public GET/HEAD documentation and calculator metadata replies get
`Cache-Control: public, max-age=0` and seven-day Cloudflare freshness; every
other reply, including calculations, errors and cookie-setting responses, is
`no-store` for both browsers and Cloudflare.
