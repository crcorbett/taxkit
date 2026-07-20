---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-07-20
review_trigger: historical intent, task evidence, or successor correction
successor: null
tombstone: false
---

# Public calculation API routes

## Overview

Expose TaxKit through public HTTP routes that are facts, rules and calculator
driven. Jurisdiction, tax year and rule-pack selection are calculator context,
not the primary route shape.

The public API should let consumers discover calculators, ask what facts are
required, submit fact values, receive schema-guided errors when fields are
missing or invalid, and inspect trace/ledger/graph evidence for calculated
results.

Initial public calculator coverage should use the implemented Australian
packages:

- `@taxkit/rules-au-pay`
- `@taxkit/rules-au-income-tax`
- `@taxkit/rules-au-stsl`

The route model must remain ready for future jurisdictions without adding a new
route family per country.

## Implementation status

Implemented in the current API package and app:

- public metadata routes for jurisdictions, tax years, calculators, calculator
  schema metadata, calculator graph diagnostics, facts and rules
- `POST /api/v1/calculators/:calculatorId/calculate`
- initial calculators `au.pay.take-home`, `au.pay.withholdings` and
  `au.income-tax.annual`
- public calculate facts exposed as an OpenAPI `anyOf` union of canonical
  rule-owned input schemas, currently take-home/pay-withholdings facts and
  annual-tax facts
- selected-calculator fact validation in `@taxkit/calculators`, so a payload
  that is valid for one calculator but incompatible with the selected
  calculator returns calculator-specific help
- schema-guided decode errors with field paths and descriptor-backed help for
  `help=errors` and `help=full`
- generated OpenAPI documentation at `/api/docs` and `/api/docs/openapi.json`

Still future work beyond this spec:

- richer `help=schema`, `help=examples` and `help=sources` payloads
- STSL and salary-sacrifice calculator variants in the public catalog

## Problem

Before implementation, TaxKit had deterministic rule packages, fact
descriptors, calculator programs, traces, ledgers and graph validation, but the
public API only exposed health and generated docs.

The first route draft grouped routes under `/api/v1/au/*`. That cuts against
the repository goal: TaxKit is a rules and calculation engine, not an
Australia-only API shape. Australia is the first implemented jurisdiction, but
the API contract should be driven by canonical calculators and their required
facts.

Public clients also need good failure modes. If a caller submits an incomplete
or malformed request, the API should return Effect Schema decode issues plus
calculator help: required facts, field paths, examples and links to the
calculator schema. Clients should not have to infer required fields from prose.

## User journeys

### Guided calculator builder

A developer wants to build a form for a calculator without hardcoding fields.
They list calculators, select one, then request its schema and help metadata.
The response tells them which facts are required, which facts are optional,
which jurisdictions and tax years are supported, and which schema fields to
render.

Routes:

```txt
GET /api/v1/calculators
GET /api/v1/calculators/:calculatorId?jurisdiction=AU&taxYear=2025-26&help=full
GET /api/v1/calculators/:calculatorId/schema?jurisdiction=AU&taxYear=2025-26&help=full
```

### Schema-guided error recovery

A client submits only `grossPay.amount` for a take-home-pay calculator. The API
rejects the request with schema-backed issues and help metadata showing that
the calculator also needs `grossPay.period` and
`taxFreeThresholdClaimed.value`.

Route:

```txt
POST /api/v1/calculators/:calculatorId/calculate?help=errors
```

The error response should be machine-readable enough for clients to highlight
fields and offer next steps.

### Employee take-home pay check

An employee wants to know what will land in their account for the next pay.
They provide facts for gross pay, tax-free threshold, and optionally salary
sacrifice or STSL debt. The selected calculator context chooses the Australian
rule pack.

Route:

```txt
POST /api/v1/calculators/au.pay.take-home/calculate
```

The result includes net pay, taxable pay, withholding totals, individual ledger
components, diagnostics and trace evidence.

### Payroll withholding preview

A payroll integrator wants withholdings without treating net pay as the primary
output. They use a withholding-oriented calculator that can share underlying
rule packs and facts with take-home pay.

Route:

```txt
POST /api/v1/calculators/au.pay.withholdings/calculate
```

The response exposes PAYG, STSL and total withholding ledger components with
active, disabled or zeroed statuses.

### Tax agent annual liability estimate

A tax agent or calculator UI submits annual taxable income for a selected tax
year and receives annual tax, offsets, Medicare levy, raw liability, final
liability and source-backed trace evidence.

Route:

```txt
POST /api/v1/calculators/au.income-tax.annual/calculate
```

### Auditor explanation review

An auditor wants to inspect why a calculator produced a number. Calculation
responses include trace and diagnostics by default. Metadata routes expose
graph structure and rule descriptors for deeper review.

Routes:

```txt
GET /api/v1/calculators/:calculatorId/graph?jurisdiction=AU&taxYear=2025-26
GET /api/v1/rules?calculator=au.pay.take-home&jurisdiction=AU&taxYear=2025-26
GET /api/v1/facts?calculator=au.pay.take-home&jurisdiction=AU&taxYear=2025-26
```

## Goals

- Make public routes calculator-driven and jurisdiction-neutral.
- Treat jurisdiction, tax year and optional rule-pack features as calculator
  context.
- Reuse canonical fact descriptors, schemas, rule descriptors, traces, ledgers
  and graph diagnostics from owning packages.
- Return schema-backed validation errors that guide clients to missing or
  invalid fields.
- Add `help` query support so clients can request richer guidance on metadata,
  schemas and errors.
- Add OpenAPI documentation for every new route through `@taxkit/http-api`.
- Keep `apps/api` thin: runtime, process config, serving and changelog only.
- Preserve browser-safe client exports for future SDK/web consumption.

## Non-goals

- Add non-Australian rule packages in the first implementation.
- Add lodged-return workflows, identity, accounts, persistence or saved
  scenarios.
- Replace package-local calculators with HTTP-only logic.
- Add a public TypeScript SDK package in this spec.
- Encode legal advice or personalized tax planning guidance in route output.

## Ownership and boundaries

- `packages/http-api` owns public HTTP API groups, route schemas, handlers,
  OpenAPI annotations and typed HTTP client exports.
- `packages/core` owns `Money`, trace, ledger, graph diagnostics and
  `CalculationEngine`.
- Rule packages own their canonical facts, descriptors, rules, parameters,
  calculators and report schemas.
- `apps/api` owns the public API app changelog and Bun runtime only.

New request and response schemas must import and compose canonical schema
values from owning packages. If a new API envelope is needed, it belongs in
`packages/http-api/src/groups/<group>.ts` and must expose schema-derived types.
Do not mirror canonical field definitions or hand-write transport DTOs.

Calculation fact payloads reuse canonical calculator input schemas from the
owning rule packages. The public API must not publish `facts: unknown` as the
calculate contract.

## Proposed approach

### Architecture alignment

This route design follows the existing architecture docs:

- [Facts](../architecture/facts.md): fact descriptors include stable IDs,
  schemas, authority and question metadata. API schema/help responses should
  expose those descriptors instead of inventing form metadata.
- [Rules and parameters](../architecture/rules-and-parameters.md): rule
  descriptors and parameter descriptors describe dependency edges, source
  references and effective periods. API rule/graph routes should expose these
  descriptors for tooling and auditability.
- [Calculators](../architecture/calculators.md): calculators are goal-specific
  Effect programs that require facts and return reports. The API calculation
  route should run selected calculators over explicit facts and selected rule
  pack layers, not switch over tax modes inside one large handler.
- [Graph, trace and ledgers](../architecture/graph-trace-ledgers.md): graph
  metadata supports missing question planning and validation, while trace and
  ledger output are part of the public calculation contract.
- [API and SDK](../architecture/api-and-sdk.md) and
  [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md): HTTP
  handlers should be a transport over the same calculator/fact/rule/schema
  facade that SDK users consume.

### Route shape

Use stable calculator and metadata routes:

```txt
GET  /api/v1/jurisdictions
GET  /api/v1/tax-years?jurisdiction=AU
GET  /api/v1/calculators
GET  /api/v1/calculators/:calculatorId
GET  /api/v1/calculators/:calculatorId/schema
POST /api/v1/calculators/:calculatorId/calculate
GET  /api/v1/calculators/:calculatorId/graph
GET  /api/v1/facts
GET  /api/v1/rules
```

Do not create top-level jurisdiction-specific route families such as
`/api/v1/au/pay/*`. Jurisdiction-specific identifiers can exist as calculator
IDs and metadata values, for example `au.pay.take-home`, but the route
structure remains the same for every future jurisdiction.

### Calculator context

Calculator requests should carry context explicitly. Context is not a loose
metadata bag; it must be schema-backed and should become branded where reused
across packages:

```json
{
  "jurisdiction": "AU",
  "taxYear": "2025-26",
  "facts": {}
}
```

The exact context schema should be owned by `packages/http-api` only while the
HTTP package is the first consumer. If the SDK facade or calculator catalog is
implemented first, the context schema should move to that owning package and
`packages/http-api` should import it. Jurisdiction and tax-year values should
use branded schemas once reused outside one module.

### Calculation facts

The calculate route remains generic:

```txt
POST /api/v1/calculators/:calculatorId/calculate
```

The request body exposes facts as a union of canonical calculator input
schemas:

```ts
CalculatorRunFacts = Schema.Union([
  TakeHomeScenarioInputSchema,
  AnnualTaxScenarioInputSchema,
]);
```

This gives generated clients and OpenAPI docs concrete fact shapes while
preserving a calculator-id route model. The generated request body exposes
these as `facts.anyOf`. Because the route schema is not dependent on the path
parameter, the calculator service performs a second decode against the selected
calculator's canonical input schema. If the facts match another calculator but
not the selected calculator, the response is a schema-backed
`CalculatorInputDecodeError` with descriptor-backed help for the selected
calculator.

Public JSON callers must send canonical schema values. For example,
take-home-pay facts use tagged `GrossPay` and `Money` values:

```json
{
  "facts": {
    "grossPay": {
      "_tag": "GrossPay",
      "amount": {
        "_tag": "Money",
        "cents": 346200,
        "currency": "AUD"
      },
      "period": "fortnightly"
    },
    "taxFreeThresholdClaimed": true
  },
  "jurisdiction": "AU",
  "taxYear": "2025-26"
}
```

Initial calculator IDs:

```txt
au.pay.take-home
au.pay.withholdings
au.income-tax.annual
```

These IDs are metadata keys for discovery. They should not force the route
shape to be Australia-specific.

### Help query parameter

Metadata, schema and calculation routes should accept a `help` query parameter:

```txt
help=none | errors | schema | examples | sources | full
```

Default:

```txt
help=errors
```

Meaning:

- `none`: return only the requested data or compact error.
- `errors`: include required facts and field-level guidance on validation
  failures.
- `schema`: include request schema, fact descriptors and result schema
  metadata.
- `examples`: include example request bodies for supported scenarios.
- `sources`: include source references and parameter artifact summaries where
  available.
- `full`: include schema, examples, sources and graph links.

Help output should be generated from canonical descriptors and schemas. Do not
write calculator-specific prose blobs when the owning fact/rule descriptors can
provide the same information.

### Schema error shape

Schema decode failures should return an error envelope with:

- tagged error type
- calculator ID
- jurisdiction and tax year when supplied
- Effect Schema issue details
- missing or invalid field paths
- required fact descriptors
- optional fact descriptors
- example request when `help=examples` or `help=full`
- links to calculator detail and schema routes

The error envelope should be schema-backed in `packages/http-api`. It should
preserve Effect Schema issue structure rather than collapsing errors into one
human string.

Schema errors should be useful before a calculator succeeds. For example, a
request missing `grossPay.period` should identify the exact missing path,
include the `GrossPayDescriptor` and the `PayPeriod` schema metadata when
`help=schema` or `help=full`, and link back to the calculator schema route.

### Route catalog

#### `GET /api/v1/jurisdictions`

Lists jurisdictions available through installed calculators. Initial response
contains `AU`, but the route shape does not assume Australia.

#### `GET /api/v1/tax-years?jurisdiction=AU`

Lists tax years available for a jurisdiction and the capabilities available in
each year.

#### `GET /api/v1/calculators`

Lists calculators with IDs, titles, jurisdictions, supported tax years, result
kind and links. Filter parameters should include:

```txt
jurisdiction
taxYear
capability
```

#### `GET /api/v1/calculators/:calculatorId`

Returns calculator metadata:

- title
- jurisdiction support
- tax-year support
- required input fact descriptors
- optional input fact descriptors
- produced fact/report schemas
- links to schema, graph and calculation routes

#### `GET /api/v1/calculators/:calculatorId/schema`

Returns the request schema, response schema and help metadata for one
calculator/context combination. This is the main route for form builders and
SDK generators.

#### `POST /api/v1/calculators/:calculatorId/calculate`

Runs a calculation from submitted facts and context. The handler should:

1. Resolve the calculator.
2. Decode context and facts with the calculator-owned schema composition.
3. Build scenario layers from canonical scenario helpers such as
   `TakeHomeScenarioLive` or `AnnualTaxScenarioLive`.
4. Select the relevant rule-pack `Layer`.
5. Run through `CalculationEngine`.
6. Return the canonical report, diagnostics and trace.

#### `GET /api/v1/calculators/:calculatorId/graph`

Returns selected rule descriptors and graph validation diagnostics for a
calculator/context combination. This should use canonical descriptors and
`GraphValidationIssue`.

#### `GET /api/v1/facts`

Lists fact descriptors. Filter parameters should include:

```txt
calculator
jurisdiction
taxYear
authority=input | derived
```

#### `GET /api/v1/rules`

Lists rule descriptors. Filter parameters should include:

```txt
calculator
jurisdiction
taxYear
provides
requires
```

### Initial calculator mappings

`au.pay.take-home` should map to the implemented pay and STSL packages:

- `GrossPay`
- `TaxFreeThresholdClaimed`
- optional `SalarySacrifice`
- optional `StslDebt`
- `TakeHomePayReport`

`au.pay.withholdings` should reuse the take-home calculation path and project a
withholding-focused response at the handler callsite. It must not create a
second withholding engine.

`au.income-tax.annual` should map to:

- `AnnualTaxableIncome`
- `AnnualTaxReport`

## Risks and tradeoffs

- Calculator IDs include jurisdiction prefixes even though routes are
  jurisdiction-neutral. That is acceptable because IDs identify concrete
  installed calculators while routes remain reusable.
- Returning rich schema help can make responses large. The `help` parameter
  lets clients choose compact or guided responses.
- A calculator catalog may initially live in `packages/http-api`, but if it
  becomes shared by SDKs it should move to the owning SDK or calculation
  package and remain schema-backed.

## Versioning and changelog impact

This documentation/spec change is versioned. It should add a patch Changeset
because it changes public API design guidance and generated docs expectations.

Implementing the routes will also be package-facing and public API-facing. The
implementation should add a patch Changeset covering:

- `@taxkit/http-api`
- every rule/core package whose public exports change

The implementation should also update:

- root `CHANGELOG.md`
- `apps/api/CHANGELOG.md`
- package changelogs through `bun run version-repo` when a version release is
  intentionally prepared

## Acceptance criteria

- The spec is linked from `docs/product-specs/index.md`.
- The sibling task list is tracked at
  `docs/product-specs/public-calculation-api-routes.tasks.json`.
- Proposed routes are calculator/fact/rule driven rather than
  jurisdiction-route driven.
- The spec keeps jurisdiction and tax year as calculator context.
- The spec requires schema-backed errors that guide missing and invalid fields.
- The spec defines `help` query behaviour for richer schema, example, source and
  error guidance.
- The spec states that route schemas must reuse canonical Effect Schema values
  and schema-derived types from owning packages.
- The spec defines user journeys for guided builder, schema-error recovery,
  employee, payroll, tax-agent and auditor use cases.
- The spec identifies versioning and changelog expectations for future
  implementation.
- `bun run verification` passes after the documentation change.

## References

- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Effect services](../architecture/effect-services.md)
- [Package ownership](../architecture/package-ownership.md)
- [Code patterns](../standards/code-patterns.md)
- [`@taxkit/core`](../../packages/core/README.md)
- [`@taxkit/http-api`](../../packages/http-api/README.md)
- [`@taxkit/rules-au-pay`](../../packages/rules/au/pay/README.md)
- [`@taxkit/rules-au-income-tax`](../../packages/rules/au/income-tax/README.md)
- [`@taxkit/rules-au-stsl`](../../packages/rules/au/stsl/README.md)
