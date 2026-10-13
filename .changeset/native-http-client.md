---
"@taxkit/api-http": major
---

Use Effect's generated client directly. `HttpApiClient.make(TaxKitApi, { baseUrl })`
from `effect/http-api`, with `TaxKitApi` from `@taxkit/api-http/api`, replaces
`createTaxKitApiClient`, `makeTaxKitApiClient`, `TaxKitApiClientOptions`,
`TaxKitHttpApiService`, `getTaxKitHttpApiClient`, `withTaxKitHttpApiClient`,
`createTaxKitApiClientLayer` and `makeTaxKitApiClientLayer`; the `./client`
and `./client/live` exports are removed. `./client/server` becomes
`./in-process`: `TaxKitApiInProcessLive` now provides an in-process
`HttpClient` for the generated client instead of a client service.
