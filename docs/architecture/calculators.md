---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-calculator-architecture-owner
last_reviewed: 2026-10-06
review_trigger: calculator composition, catalogue execution or domain error contract change
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

Reusable catalogue entries couple one input Schema with its typed `calculate`
continuation. They do not expose an additional erased `program` Effect. The
rule package owns the actual typed calculator program and rule-pack Layer;
metadata and retained output values are unchanged.

## Running A Calculator

```ts
const calculation = CalculateTakeHomePay.pipe(
  Effect.provide(AuTakeHomePay2025_26_Live),
  Effect.provide(TakeHomeScenarioLiveFromInput(input))
);
```

Here `input` is the checked rule-owned scenario Type. The application runner
executes this lazy program; awaiting an Effect does not execute it. The compiler
shows unresolved requirements if a rule pack or scenario is missing.

## Calculator Domains

The retained calculator programs are goal-specific:

```txt
CalculateTakeHomePay
CalculatePayWithholdings
CalculateAnnualTax
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

Core `CalculationError.cause` represents missing, present undefined and present
diagnostic values with nested Options and a missing-key constructor default.
Its codec retains historical null/opaque diagnostics as values. The current
rule producers omit diagnostics; this migration does not sanitise legacy
diagnostic content or make it safe for telemetry. Public representations retain
their existing codec.

Public calculator orchestration must keep request facts tied to canonical
scenario schemas. `@taxkit/calculators` composes the generic public calculate
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

Each report owner defines its ruleset-version Schema as an exact literal and
emits that value directly. Ruleset versions describe the independent tax-rule
edition used for a calculation; they are not read from package manifests at
runtime. Current report values are `rules-au-pay/1.0.0` and
`rules-au-income-tax/1.0.1`.

## Question Planning

Calculators should expose goal requirements through graph metadata. The UI and CLI can use this to ask for missing facts.

```txt
Goal: take-home pay
Known facts: gross pay, pay frequency
Missing facts: tax-free threshold claimed, HELP/STSL status, salary sacrifice
```

Question planning should support minimal calculator flows first. Applications can build richer input experiences on top of the same fact descriptors.
