---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Calculators

A calculator is an Effect program that requires facts and returns a report. It does not import global rule registries and it does not mutate shared state.

Calculator ids and context values are canonical boundary values. Shared scalar
brands such as `CalculatorId`, `Jurisdiction` and `TaxYear` live in
`packages/core`; rule packages narrow those brands to the literal ids,
jurisdictions and tax years they support. Reusable orchestration code must
compose those rule-owned schemas instead of redeclaring local string fields.

## Calculator Pattern

```ts
export const CalculateTakeHomePay = Effect.gen(function* () {
  const grossPay = yield* GrossPayFact;
  const taxablePay = yield* TaxablePayFact;
  const payg = yield* PaygWithholdingFact;
  const netPay = yield* NetPayFact;

  return new TakeHomePayReport({
    grossPay,
    taxablePay,
    payg,
    netPay,
  });
});
```

The calculator should be small and declarative. Rule layers derive the facts. Scenario layers provide the accepted inputs.

## Running A Calculator

```ts
const result = await CalculateTakeHomePay.pipe(
  Effect.provide(AuEmployeePay2025_26.Live),
  Effect.provide(EmployeeScenario.fromUserInput(input))
);
```

The compiler should show unresolved requirements if a rule pack or scenario is missing.

## Calculator Domains

Initial calculator programs should be goal-specific:

```txt
CalculateTakeHomePay
CalculatePaygWithholding
CalculateSuperGuarantee
CalculateAnnualTaxEstimate
CalculateDeductionSummary
CalculateMortgageRepayment
```

Avoid one large `calculate()` function with mode switches for PAYG, annual tax, FBT, super, mortgage and deductions.

## Scenario Layers

Scenario layers decode user input through Effect Schema, then provide accepted input facts.

```txt
User input
  -> schema decode
  -> scenario dates
  -> accepted fact layer
  -> calculator
```

Scenario construction must fail if required boundary values are invalid. It should not silently coerce ambiguous tax-significant values.

Expected failures stay in the typed Effect error channel. Schema decode errors
should be mapped to schema-backed public errors at the service boundary, and
domain failures such as `CalculationError` should propagate as failures. Do not
use `Effect.die` for recoverable calculator, schema or domain errors.

Public calculator orchestration must keep request facts tied to canonical
scenario schemas. `@whattax/calculators` composes the generic public calculate
contract as a union of rule-owned scenario input schemas so API docs and
clients can see concrete fact shapes, then decodes again with the selected
catalog entry's `inputSchema` before running the calculator. Do not replace
this with `Schema.Unknown`, mirrored fact DTOs or a loose record of arbitrary
values.

## Calculation Runs

A calculation run is a deterministic composition of explicit inputs, rule packs and parameter layers.

```txt
input facts
  + official rule pack
  + official parameter layers
  -> output report
```

## Reports

Reports should be schema-backed values assembled from lower-level facts, traces and ledgers.

For v1, prefer plain report schema values over report facts unless another calculator needs to depend on the report as an input.

Reports should include:

- output facts
- scenario date context
- rule pack versions
- source references
- trace root
- optional ledger
- diagnostics and warnings

## Question Planning

Calculators should expose goal requirements through graph metadata. The UI and CLI can use this to ask for missing facts.

```txt
Goal: take-home pay
Known facts: gross pay, pay frequency
Missing facts: tax-free threshold claimed, HELP/STSL status, salary sacrifice
```

Question planning should support minimal calculator flows first. Applications can build richer input experiences on top of the same fact descriptors.
