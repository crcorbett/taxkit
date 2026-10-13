---
"@taxkit/rules-au-pay": major
"@taxkit/rules-au-income-tax": major
"@taxkit/calculators": patch
---

Scenario Layers are static. Decode `TakeHomeScenarioInputSchema` or
`AnnualTaxScenarioInputSchema` at your boundary, supply the value with
`Layer.succeed(TakeHomeScenario)(input)` or
`Layer.succeed(AnnualTaxScenario)(input)`, and use `TakeHomeScenarioLive` or
`AnnualTaxScenarioLive`. `TakeHomeScenarioLiveFromInput`,
`AnnualTaxScenarioLiveFromInput` and the unknown-input
`TakeHomeScenarioLive(input)` and `AnnualTaxScenarioLive(input)` factories are
removed.
