---
"@whattax/calculators": patch
"@whattax/http-api": patch
---

Move public calculator execution, graph validation and schema-guided expected
error shaping into the reusable `@whattax/calculators` service. HTTP handlers
now delegate to `PublicCalculatorService`, and the HTTP route layer composes
the calculator service with the core calculation engine once instead of inside
requests.
