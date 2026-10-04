---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-au-pay-owner
last_reviewed: 2026-10-05
review_trigger: schemas, exports, calculator contract or runtime ownership change
---

# Australian Pay Rules

Implemented rule package for Australian take-home pay and PAYG withholding.

## Scope

`@taxkit/rules-au-pay` owns gross pay, taxable pay, PAYG withholding,
withholdings ledger, net pay, salary-sacrifice pay effects, Schedule 1
parameters, descriptors, rule packs, calculator program and golden tests.

`TakeHomePayReport.rulePackVersion` is the exact literal
`rules-au-pay/1.0.0`. It versions this package's ruleset independently from the
package manifest version so callers can identify the pay rules used without
runtime manifest reads.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package and `@taxkit/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official Schedule 1 parameters separate from algorithms.

## Commands

```sh
bun run --filter=@taxkit/rules-au-pay check-types
bun run --filter=@taxkit/rules-au-pay test
```

## Packaging

The build removes `dist` before compiling. Workspace exports retain `source`
conditions, while `publishConfig.exports` and `files` define a dist-only
tarball validated by the SDK-owned strict downstream gate.

## Related Docs

- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/standards/code-patterns.md`

## Browser Schema entrypoints

Use `@taxkit/rules-au-pay/schemas` for canonical calculator metadata, `TakeHomePayReport`, `PayWithholdingsLedger` and `TakeHomeScenarioInputSchema` without live calculator or rule-pack imports. Existing root/calculator exports retain the same definitions and calculation behaviour.

The [transport architecture](../../../../docs/architecture/api-and-sdk.md) and active clean-slate plan own application use and proof limits.


The salary-sacrifice fact module imports canonical fact definitions through
`@taxkit/core/facts`, keeping the full calculation engine out of browser fact
consumers. The Website's native built-import test qualifies this distinction;
retained rules, report values and public fact exports are unchanged.
