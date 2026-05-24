---
"@whattax/calculators": patch
"@whattax/http-api": patch
---

Add the initial calculators workspace package shell with explicit exports,
package docs and build/typecheck wiring for the upcoming reusable calculator
service extraction. Move reusable public calculator schemas, catalog entries
and metadata projection helpers from `@whattax/http-api` into
`@whattax/calculators`, leaving HTTP route definitions and handler behavior
compatible.
