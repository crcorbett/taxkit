---
"@whattax/http-api": patch
"@whattax/rules-au-income-tax": patch
"@whattax/rules-au-pay": patch
---

Document and align the jurisdiction-neutral public calculation API route design
around calculator, fact and rule discovery, schema-guided validation errors,
and `help` parameters for richer client guidance.

Add the initial public calculation API schema foundation, including
schema-backed calculator IDs, context and help-mode contracts, public error
envelopes and the initial AU calculator catalog. Add a canonical PAYG-only
withholding rule-pack layer for the withholding catalog entry.

Expose public metadata routes for jurisdictions, tax years, calculator
discovery, calculator schema metadata, graph diagnostics, canonical fact
descriptors and canonical rule descriptors. Calculation execution remains
deferred.

Expose `POST /api/v1/calculators/:calculatorId/calculate` for the initial AU
calculator catalog. Calculation requests decode canonical scenario facts, use
catalog-selected rule-pack layers and run through `CalculationEngine`; schema
decode failures return machine-readable issue paths plus descriptor-backed help
when requested.
