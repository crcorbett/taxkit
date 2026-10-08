---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-au-stsl-owner
last_reviewed: 2026-10-06
review_trigger: schemas, exports, calculator contract or runtime ownership change
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
- STSL rows check ordered non-negative inclusive weekly bounds and multipliers
  from zero to one. The table starts at zero, covers adjacent cents and has only
  its final bound open. Saved and decoded table forms enforce the same coverage
  check. Retained coefficients, effective dates and source bytes stay unchanged.
- Derived money and combined withholding totals use core fallible constructors
  and return safe `CalculationError` failures for unsupported amounts. Retained
  Schedule 8 coefficients, source records and known STSL results stay unchanged.

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


Trace formula and rounding values now use Core's nested Option contract. Use
the owning trace codec for transport or saved snapshots, and `Option.flatten`
to read content when missing and undefined mean the same thing. Descriptor
questions/source artifacts use Option and rule parameters are total arrays.
See the [Core owner](../../../core/README.md). Existing formulas, tax amounts,
source records and snapshot expectations are unchanged.
