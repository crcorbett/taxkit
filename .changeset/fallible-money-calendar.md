---
"@taxkit/core": major
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-income-tax": major
"@taxkit/rules-au-stsl": major
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/api-rpc": major
"@taxkit/sdk": major
"@taxkit/docs-content": patch
---

Money, date and decimal helpers now return checked Effect failures for invalid
inputs and amounts that cannot fit safe whole cents. `aud` requires checked
`Cents`; use `audFromCents` for a number that still needs checking. Addition,
subtraction, money rounding, decimal conversion and ledger totals now return
Effects. Rule calculations map these failures to safe `CalculationError` values;
`buildPayWithholdingsLedger` also returns an Effect.

DateInterval ends now use Option values while retaining the original encoded
strings, missing keys, explicitly undefined keys and saved bytes. Metadata
consumers see the new domain type through the affected packages; HTTP and RPC
representations remain unchanged. Open intervals have no finite surrogate end,
and Australian year helpers check the entire label and representable boundaries.

Update callers and examples to yield fallible operations or assemble unchanged
Money from already checked cents. Retained tables, source records, golden tax
results and Medicare thresholds are unchanged. Publication is not included.
