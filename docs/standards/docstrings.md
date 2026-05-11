# Docstring Conventions

Docstrings should help external contributors understand tax-domain intent,
Effect dependencies, and public API guarantees. They should not narrate code
that is already obvious from names and types.

## Lint Contract

WhatTax follows Ultracite's JSDoc lint rules. Do not fight the linter: if
`jsdoc/check-tag-names` rejects a tag, the tag is not part of this repository's
docstring vocabulary.

Allowed tags in normal source docs:

- `@example`
- `@param`
- `@returns`
- `@throws`
- `@since`

Do not use `@category`.

## When To Add Docstrings

Add a docstring for:

- Exported schemas, branded primitives, tagged classes, and descriptors.
- Rule layers, calculators, and scenario helpers.
- Parameter tables, parameter descriptors, parameter layers, and official
  source references.
- Helpers that encode tax-office rounding, period conversion, threshold lookup,
  or graph-validation behavior.
- Non-obvious public package entrypoints.

Docstrings are optional for obvious private constants, test fixtures, and small
local helpers unless the tax logic is easy to misread.

## Required Shape

Start with a short domain sentence. Add Effect requirements, failure modes, and
examples only when they clarify the public contract.

```ts
/**
 * Calculates the PAYG withholding ledger component from taxable pay and the
 * selected ATO Schedule 1 table.
 *
 * Requires `TaxablePayFact`, `TaxFreeThresholdClaimedFact`, and
 * `AtoSchedule1Table`. Fails with `CalculationError` when no official table row
 * covers the weekly formula amount.
 *
 * @since 0.1.0
 */
export const PaygWithholdingLive = Layer.effect(...);
```

## Examples

Use examples when a public helper is easier to understand through usage. Keep
examples executable-looking and minimal.

````ts
/**
 * Brands whole cents as AUD money.
 *
 * @example
 * ```ts
 * import { aud } from "@whattax/core/primitives";
 *
 * const amount = aud(12_345);
 * ```
 *
 * @since 0.1.0
 */
export const aud = (cents: number): Money => ...
````

Use `@param` and `@returns` only when they add information beyond the TypeScript
signature.

```ts
/**
 * Scales a weekly withholding amount to the employee's pay period.
 *
 * @param weeklyWithholdingDollars - ATO weekly withholding in whole dollars.
 * @returns Whole-dollar withholding for the requested pay period.
 *
 * @since 0.1.0
 */
export const scaleWeeklyWithholdingToPayPeriodDollars = (...)
```

## Content Guidelines

- Start with what the symbol means in the tax domain.
- Mention Effect requirements and provided facts for rule layers.
- Mention official source scope and known exclusions for parameter tables.
- Name the rounding or threshold convention when it matters to the result.
- Explain why a public abstraction exists when it is not obvious.
- Keep examples small and import from public package paths.
- Do not include UI, SaaS, or downstream product context in WhatTax docs.
- Do not duplicate implementation line-by-line.

## Source References

For official tax rules and parameters, identify the source family and effective
year in prose. The concrete URL belongs in `SourceRef` so traces and graph
validation can use it.

## Stability Language

Use stable wording for public APIs. Prefer "provides", "requires", "decodes",
"fails with", and "rounds" over vague terms like "handles" or "does stuff".
