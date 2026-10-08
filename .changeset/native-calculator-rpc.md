---
"@taxkit/api-rpc": minor
"@taxkit/core": minor
"@taxkit/rules-au-pay": minor
"@taxkit/rules-au-income-tax": minor
"@taxkit/calculators": patch
---

Add a private native Effect RPC calculation contract with caller-scoped clients,
checked response failures, a whole-response deadline and safe native request and
error encoding. Calculation remains with the existing calculator service.

Separate canonical diagnostics and calculator report/input Schemas from live
calculation imports, and add narrow public Schema exports. Existing exports
retain the same class identities and calculation values.
