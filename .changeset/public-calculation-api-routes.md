---
"@whattax/http-api": patch
"@whattax/rules-au-pay": patch
---

Document and align the jurisdiction-neutral public calculation API route design
around calculator, fact and rule discovery, schema-guided validation errors,
and `help` parameters for richer client guidance.

Add the initial public calculation API schema foundation, including
schema-backed calculator IDs, context and help-mode contracts, public error
envelopes and the initial AU calculator catalog. Add a canonical PAYG-only
withholding rule-pack layer for the withholding catalog entry.
