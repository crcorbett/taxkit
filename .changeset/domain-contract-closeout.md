---
"@taxkit/core": major
"@taxkit/calculators": major
"@taxkit/api-http": major
"@taxkit/sdk": major
"@taxkit/docs-content": patch
---

Core calculation error causes use canonical nested Options with omitted-field
constructor defaults. Original missing, undefined, null and opaque diagnostic
representations are retained; current rule errors omit diagnostics. Legacy
values are not made safe for telemetry by this type change.

Calculator catalogue entries expose their checked selected continuation without
an unused generic program Effect. Actual rule programs and all retained tax,
report, metadata, table and source values remain unchanged.
