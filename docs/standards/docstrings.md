# Docstring Conventions

Docstrings should help external contributors understand tax-domain intent,
Effect dependencies, and public API guarantees. They should not narrate code
that is already obvious from names and types.

## When To Add Docstrings

Add a docstring for:

- Exported schemas, branded primitives, tagged classes, and descriptors.
- Rule layers and calculators.
- Parameter tables and official source references.
- Helpers that encode tax-office rounding, period conversion, threshold, or
  graph-validation behavior.
- Non-obvious public package entrypoints.

Docstrings are optional for obvious private constants, test fixtures, and small
local helpers unless the tax logic is easy to misread.

## Required Shape

Use concise JSDoc comments:

```ts
/**
 * Calculates the PAYG withholding ledger component from taxable pay and the
 * selected ATO Schedule 1 table.
 *
 * Requires `TaxablePayFact`, `TaxFreeThresholdClaimedFact`, and
 * `AtoSchedule1Table`. Fails with `CalculationError` when no official table row
 * covers the weekly formula amount.
 */
export const PaygWithholdingLive = Layer.effect(...)
```

## Content Guidelines

- Start with what the symbol means in the tax domain.
- Mention Effect requirements and provided facts for rule layers.
- Mention official source scope and known exclusions for parameter tables.
- Name the rounding or threshold convention when it matters to the result.
- Explain why a public abstraction exists when it is not obvious.
- Do not include UI, SaaS, or downstream product context in WhatTax docs.
- Do not duplicate implementation line-by-line.

## Source References

For official tax rules and parameters, prefer docstrings that identify the
source family and effective year. The concrete URL belongs in `SourceRef` so
traces and graph validation can use it.

## Stability Language

Use stable wording for public APIs. Prefer "provides", "requires", "decodes",
"fails with", and "rounds" over vague terms like "handles" or "does stuff".
