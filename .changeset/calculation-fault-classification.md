---
"taxkit": major
"api": major
---

Report only scenario-dependent calculation failures as `CalculationError`. Its `reason` is now required and is either `period-mismatch` or the `MoneyError` reason that caused the failure (for example `negative` when salary sacrifice exceeds gross pay, or `range` beyond safe cents); the former `rule`, `graph` and `output-invariant` reasons and the constructor default are removed. An invalid rule graph, a gap in a checked parameter table or a broken report invariant is now a defect carrying the new `CalculationInvariantViolation`: Effect callers see a defect, the plain interface returns `TaxKitUnexpectedError`, the HTTP API answers 500 and remote MCP answers with its internal error. `CalculationFailureReason` and `CalculationInvariantViolation` are exported from `taxkit/core`.

Calculator metadata reads are synchronous catalogue projections. `CalculatorMetadataError` now contains only `UnsupportedCalculatorContextError`, and the metadata HTTP routes no longer declare a 504 timeout; list routes declare no error. Calculations keep their five-second budget, capacity and rate admission.
