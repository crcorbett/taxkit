---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Australian STSL Rules

Implemented rule package for Australian study and training support loan
withholding components.

## Scope

`@whattax/rules-au-stsl` owns STSL debt facts, Schedule 8 parameter tables,
STSL withholding components, STSL-aware withholdings ledger integration,
descriptors, rule packs and golden tests.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package, `@whattax/rules-au-pay` and `@whattax/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official Schedule 8 parameters separate from algorithms.

## Commands

```sh
bun run --filter=@whattax/rules-au-stsl check-types
bun run --filter=@whattax/rules-au-stsl test
```

## Related Docs

- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/standards/code-patterns.md`
