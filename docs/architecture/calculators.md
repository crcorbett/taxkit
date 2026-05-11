# Calculators

A calculator is an Effect program that requires facts and returns a report. It does not import global rule registries and it does not mutate shared state.

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
