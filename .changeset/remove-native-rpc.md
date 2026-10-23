---
"api": major
"@taxkit/api-http": major
"@taxkit/calculators": minor
"@taxkit/observability": patch
---

Remove the public native RPC endpoint at POST `/rpc` and the private
`@taxkit/api-rpc` package. Machine callers use the public HTTP API, its
OpenAPI description or remote MCP, which keep the same calculator and
documentation operations, limits and errors. `@taxkit/api-http/routes` no
longer exports `rpcPath`, `RpcRoutePath` or `isTrustedCalculationPath`, and
host request records no longer use the `rpc` route family. Shared calculator
test fixtures move to `@taxkit/calculators/testing/fixtures`.
