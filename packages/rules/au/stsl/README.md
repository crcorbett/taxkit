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

`@taxkit/rules-au-stsl` owns STSL debt facts, Schedule 8 parameter tables,
STSL withholding components, STSL-aware withholdings ledger integration,
descriptors, rule packs and golden tests.

## Guardrails

- Reuse canonical schemas, facts, parameter services, rule IDs and component
  IDs from this package, `@taxkit/rules-au-pay` and `@taxkit/core`.
- Use Effect `Layer`s for rule derivations and parameter services.
- Use Effect `Array`, `HashMap`, `HashSet`, `Match`, `Context`, `Layer`,
  `Schema`, `Data`, `Record`, `Result` and `Exit` where they fit.
- Do not mirror canonical IDs or fact shapes as local `string` or DTO fields.
- Keep official Schedule 8 parameters separate from algorithms.

## Commands

```sh
bun run --filter=@taxkit/rules-au-stsl check-types
bun run --filter=@taxkit/rules-au-stsl test
```

## Packaging

The build removes `dist` before compiling. Workspace exports retain `source`
conditions, while `publishConfig.exports` and `files` define a dist-only
tarball validated by the SDK-owned strict downstream gate.

## Related Docs

- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/standards/code-patterns.md`
