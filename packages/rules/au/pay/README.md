---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Australian Pay Rules

Implemented rule package for Australian take-home pay and PAYG withholding.

## Scope

`@taxkit/rules-au-pay` owns gross pay, taxable pay, PAYG withholding,
withholdings ledger, net pay, salary-sacrifice pay effects, Schedule 1
parameters, descriptors, rule packs, calculator program and golden tests.

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
