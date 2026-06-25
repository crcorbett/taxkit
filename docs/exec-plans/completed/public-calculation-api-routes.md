---
status: completed
last_reviewed: 2026-06-25
source_of_truth: docs
confidence: medium
---

# Public Calculation API Routes Execution Plan

## Goal

Implement [Public calculation API routes](../../product-specs/public-calculation-api-routes.md)
through the ordered task list at
[public-calculation-api-routes.tasks.json](../../product-specs/public-calculation-api-routes.tasks.json).

The rollout MUST stay calculator, fact, rule and graph driven. Jurisdiction and
tax year are schema-backed calculator context, not route-family structure.

## Operating Rules

- Implement one task-list slice at a time.
- Delegate exactly one bounded task to a subagent where useful.
- Parent-review each diff against the spec, task object and architecture docs
  before accepting the slice.
- Run `bun run verification` for each accepted slice.
- Keep Changeset and API changelog evidence current for package-facing and
  public API-facing work.
- Commit only after the coherent slice passes verification and review.

## Task Status

| Task | Status | Notes |
| --- | --- | --- |
| PUBLIC-API-001 | complete | Added schema-backed calculator catalog foundation and canonical PAYG-only withholding layer. Parent verification passed. Commit `e730352`. |
| PUBLIC-API-002 | complete | Added metadata, schema, facts, rules and graph routes. Parent verification passed. |
| PUBLIC-API-003 | complete | Added schema-guided calculation execution. Parent verification passed. |
| PUBLIC-API-004 | complete | Updated docs, changelogs, versioning evidence and final smoke evidence. |

## Validation Log

### PUBLIC-API-001

- Commit: `e730352 Add public calculator catalog schemas`
- Verification:
  - `bun run verification` passed.
  - `bun changeset status --verbose` previews a fixed release-train patch bump
    to `0.0.2`.
- Parent review:
  - Catalog entries reuse canonical fact descriptors, rule descriptors, report
    schemas and rule-pack layers.
  - `@whattax/http-api` dependencies on implemented rule packages are aligned
    with the API package owning calculator metadata and future handlers.
  - No public calculation execution routes were added in this slice.

### PUBLIC-API-002

- Verification:
  - `bun run verification` passed.
  - `bun run --filter=@whattax/http-api check-types` passed.
  - `bun changeset status --verbose` previews a fixed release-train patch bump
    to `0.0.2`.
- API smoke checks:
  - Started `apps/api` on `127.0.0.1:4017`.
  - `/api/docs/openapi.json` contains the public metadata route family.
  - `/api/v1/calculators` returns the initial three calculator IDs.
  - `/api/v1/calculators/au.pay.take-home/schema?help=full` returns
    canonical fact IDs, rule IDs and descriptor metadata.
  - `/api/v1/facts?calculator=au.pay.take-home` and
    `/api/v1/rules?calculator=au.pay.take-home` return descriptor-derived
    metadata.
  - `/api/v1/calculators/au.pay.take-home/graph` returns graph edges and an
    empty canonical graph validation issue list.
- Parent review:
  - Routes are implemented through the Effect HTTP API group and handler layer.
  - Metadata values are derived from canonical fact descriptors, rule
    descriptors, source refs, parameter periods and graph diagnostics.
  - No public calculation execution route was added in this slice.

### PUBLIC-API-003

- Verification:
  - `bun run verification` passed.
  - `bun run --filter=@whattax/http-api check-types` passed.
  - `bun changeset status --verbose` previews a fixed release-train patch bump
    to `0.0.2`.
  - Changed-file audit found no `Object.entries`, `Object.values`, manual
    `_tag` object literals, unsafe casts, non-null assertions, runtime
    creation, or mirrored `id: string` fields.
- API smoke checks:
  - Started `apps/api` on `127.0.0.1:4017`.
  - `/api/docs/openapi.json` contains
    `POST /api/v1/calculators/{calculatorId}/calculate` as
    `publicCalculationMetadata.calculate` with `calculatorId` and `help`
    parameters and `200`/`400` responses.
  - `au.pay.take-home` calculation returned `netPay.cents = 119600`,
    `withholdingsTotal.cents = 30400` and zero graph issues.
  - `au.pay.withholdings` calculation returned `total.cents = 30400`, one
    component and zero graph issues.
  - `au.income-tax.annual` calculation returned `liability.cents = 1958800`,
    `rawLiability.cents = 1958800` and zero graph issues.
  - Missing `grossPay.period` with `help=errors` returned `400 Bad Request`
    with issue path `["grossPay", "period"]` and descriptor-backed help.
- Parent review:
  - Calculation execution is catalog-driven and composes canonical scenario
    layers, rule-pack layers and `CalculationEngine`.
  - Request handlers do not create runtimes or import app runtime modules.
  - Rule trace inputs now encode decimal coefficients as strings so public
    schema responses remain JSON-compatible.

### PUBLIC-API-004

- Verification:
  - `bun run verification` passed.
  - `bun changeset status --verbose` previews a fixed release-train patch bump
    to `0.0.2`.
- API smoke checks:
  - Started `apps/api` on `127.0.0.1:4017`.
  - `/api/docs/openapi.json` lists the implemented public API route family:
    jurisdictions, tax years, calculators, calculator detail, schema, graph,
    calculate, facts and rules.
  - `/api/v1/calculators` returns `au.pay.take-home`,
    `au.pay.withholdings` and `au.income-tax.annual`.
  - `POST /api/v1/calculators/au.pay.take-home/calculate` returned
    `netPay.cents = 119600`, `withholdingsTotal.cents = 30400` and zero graph
    issues.
  - Missing `grossPay.period` with `help=errors` returned `400 Bad Request`
    with issue path `["grossPay", "period"]` and descriptor-backed help.
- Docs and versioning review:
  - Root README, API app README, API/SDK architecture, testing/quality,
    product spec, task list and root changelog now describe the implemented
    public calculation API.
  - `/api/v1/au/*` appears only as an explicit anti-pattern in the spec and
    architecture docs.
  - Changeset and app changelog coverage remains current for public API and
    package-facing changes.
  - Browser automation was not exposed in this turn; generated OpenAPI and
    HTTP smoke evidence were used for route visibility.
