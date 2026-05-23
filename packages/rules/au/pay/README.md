---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Australian Pay Rules

Implemented rule package for Australian take-home pay and PAYG withholding.

## Scope

`@whattax/rules-au-pay` owns gross pay, taxable pay, PAYG withholding,
withholdings ledger, net pay, salary-sacrifice pay effects, Schedule 1
parameters, descriptors, rule packs, calculator program and golden tests.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package and `@whattax/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official Schedule 1 parameters separate from algorithms.

## Commands

```sh
bun run --filter=@whattax/rules-au-pay check-types
bun run --filter=@whattax/rules-au-pay test
```

## Related Docs

- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/standards/code-patterns.md`
