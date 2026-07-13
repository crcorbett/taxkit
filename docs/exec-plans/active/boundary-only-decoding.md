---
status: active
last_reviewed: 2026-07-13
source_of_truth: execution-plan
confidence: high
---

# Boundary-only decoding execution plan

Spec:
[Boundary-only decoding](../../product-specs/boundary-only-decoding.md)

Task list:
[`boundary-only-decoding.tasks.json`](../../product-specs/boundary-only-decoding.tasks.json)

## Goal

Implement the boundary-only decoding tasks sequentially. Each task uses one
subagent when available; the parent reviews the diff, audits the architecture,
verifies the required gates and accepts the task before the next task begins.
After three failed correction turns for one task, stop and replan or request a
decision.

## Status

| Task | Status | Evidence |
| --- | --- | --- |
| DECODE-001 | accepted | Decoder inventory and durable architecture contract are recorded below. No lint or runtime code changed. |
| DECODE-002 | pending | Add the global Oxlint rule and exact allowlist after DECODE-001 acceptance. |
| DECODE-003 | pending | Remove repeated calculator decoding and isolate SDK report narrowing. |
| DECODE-004 | pending | Move docs route decoding before React composition. |
| DECODE-005 | pending | Complete the repository audit and documentation close-out. |

## DECODE-001 inventory

### Audit command and scope

The inventory uses this command from the repository root:

```bash
rg -n \
  --glob '!node_modules/**' \
  --glob '!**/dist/**' \
  --glob '!**/build/**' \
  --glob '!**/.source/**' \
  --glob '!**/generated/**' \
  --glob '!**/coverage/**' \
  --glob '!**/*.gen.*' \
  --glob '*.{ts,tsx,js,mjs,cjs}' \
  '(?:Schema\\.)?decode(?:Unknown|[A-Z])|\\.decode(?:[A-Z]|$)' \
  apps packages tools scripts oxlint.config.ts
```

It found 42 repository-owned executable decoder operations. The command also
finds three diagnostic strings in `tools/oxlint/whattax-rules.js`; they are not
calls and are excluded from the count. Calls to local helpers such as
`decodeRouteJson`, `decodeJson` and `decodeFrontmatter` are not counted again:
their decoder-owning bodies are listed at the actual Schema callsite.

The inventory excludes dependencies, build output, generated route/source
trees and coverage. The Effect HTTP route-schema decode for
`CalculatorRunRequest` is framework-owned and implicit in the declared route
payload schema, so it is not an explicit repository callsite. It remains a
required public unknown-input boundary in the call graph.

| Location | Operations | Classification | DECODE-001 finding |
| --- | --- | --- | --- |
| `apps/api/src/config.ts:30` | 1 | External trust boundary | Environment-derived API config is decoded by the app-owned config schema. |
| `apps/api/scripts/smoke-public-routes.runtime.ts:237-238,323,390` | 4 | Focused boundary test | Process output, HTTP JSON and the canonical calculate fixture are normalised for the API smoke program. |
| `apps/docs/examples/node-server.ts:30`, `apps/docs/examples/browser-http.ts:53` | 2 | External trust boundary | Checked examples decode HTTP request/response representations. |
| `apps/docs/src/lib/docs/loaders.ts:35,43` | 2 | Public unknown-input boundary; external trust boundary | Server-function input and URL-derived path are decoded before docs-content lookup. |
| `apps/docs/src/lib/docs/route-boundary.ts:79,118` | 2 | External trust boundary, incorrectly placed | The server-function `Exit` codec decoder is created here and invoked by a React render path. DECODE-004 must move invocation before composition. |
| `packages/docs-content/src/validation/policy.ts:78,157,237,385` | 4 | External trust boundary | Filesystem paths, YAML frontmatter, MDX component names and navigation JSON are normalised by docs-content. |
| `packages/docs-content/src/validation/policy.ts:534,537` | 2 | Internal/repeated decode | Static reference paths are decoded again despite being repository literals; record for later review rather than allowlisting as a new boundary. |
| `packages/docs-content/src/live.layer.ts:42,75` | 2 | External-library normalisation boundary | Fumadocs slugs are converted into canonical docs paths and slugs. |
| `packages/docs-content/src/validation/policy.runtime.test.ts:34,40,61` | 3 | Focused boundary test | Tests prove canonical docs path/source schemas. |
| `packages/docs-fumadocs/src/config.ts:30` | 1 | External-library normalisation boundary | Shiki metadata is decoded before presentation handling. |
| `packages/api/http/src/openapi.ts:30,33,48` | 3 | External-library normalisation boundary | Effect OpenAPI output is converted to canonical JSON before deterministic normalisation. |
| `packages/api/http/__tests__/openapi-snapshot.test.ts:21`, `packages/api/http/__tests__/public-calculation-api.test.ts:53,76,125,216,219` | 6 | Focused boundary test | Snapshot and in-process HTTP response/error contracts are decoded with owning schemas. |
| `packages/calculators/src/live.layer.ts:45` | 1 | Dynamic type-erasure boundary | The selected catalogue input schema validates route-union facts after calculator selection. This must remain. |
| `packages/calculators/src/errors.ts:40` | 1 | External-library normalisation boundary | Effect Schema standard formatter segments are normalised before public error projection. |
| `packages/rules/au/pay/src/calculator/take-home-pay.ts:105`, `packages/rules/au/income-tax/src/calculator/annual-tax.ts:79` | 2 | Internal/repeated decode | Rule scenario layers re-decode facts already decoded by the selected catalogue entry. DECODE-003 removes these from internal composition while preserving any public `unknown` adapters. |
| `packages/sdk/typescript/src/types.ts:100`, `packages/sdk/typescript/src/effect.ts:98`, `packages/sdk/typescript/src/index.ts:130` | 3 | Dynamic type-erasure boundary | The SDK descriptor decoder is created and invoked to narrow a report union after selected calculation dispatch. DECODE-003 keeps the boundary but removes the unnecessary Exit-to-Effect conversion. |
| `packages/sdk/typescript/scripts/validate-downstream-consumer.runtime.ts:180-181,226` | 3 | External trust boundary | Child-process output and package manifest JSON are decoded by the downstream validation tool. |

### Current and target call graphs

The audit confirms the spec's route-union, selected-calculator,
scenario-layer, SDK descriptor and docs-render locations. One wording change
was made to the current calculator graph: the current code passes `facts` to
an erased entry continuation; it does not contain a literal `facts as unknown`
cast.

```ts
Production: current calculator input

HTTP request body
  -> Effect HTTP CalculatorRunRequest route-schema decode
    -> PublicCalculatorService.calculate
      -> CalculatorCatalogEntry.inputSchema decode
        -> erased entry.calculate(facts, validationIssues) continuation
          -> TakeHomeScenarioLive / AnnualTaxScenarioLive decode again
            -> typed scenario Layer
              -> CalculationEngine
```

```ts
Production: target calculator input

HTTP request body
  -> Effect HTTP CalculatorRunRequest route-schema decode
    -> PublicCalculatorService.calculate
      -> calculator catalogue dispatch boundary
        -> policy-owning generic catalogue entry
          -> selected canonical inputSchema decode
            -> constructor-closed InputSchema["Type"] continuation
              -> typed rule-owned scenario Layer constructor
                -> CalculationEngine
```

```ts
Production: current docs frontend boundary

docs server function
  -> encode typed Exit for transport
    -> Route.useLoaderData returns encoded representation
      -> route component calls docs*RouteBoundary.match(encoded)
        -> route-boundary decoder executes during React render
          -> success/error JSX branch
```

```ts
Production: target frontend boundary

URL, HTTP, storage or server-function representation
  -> route loader, action or dedicated boundary adapter
    -> canonical Schema decode with typed boundary error
      -> Result<typed success, typed expected failure>
        -> route or container composition
          -> leaf component with focused readonly values, callbacks or children
            -> render only; no decode, service lookup or runtime execution
```

The SDK report-narrowing graph also remains accurate. `defineSdkCalculation`
currently builds a decoder through `Schema.decodeUnknownExit` and immediately
returns to `Effect`; DECODE-003 will use the direct Effect decoder while
retaining descriptor narrowing at the selected-calculation boundary.

## Architecture decisions

- `docs/architecture/effect-services.md` owns decoder categories, linear
  Effect/error behaviour, generic schema-to-continuation coupling and the
  no-repeat rule.
- `docs/architecture/testing-and-quality.md` owns the global rule, exact
  allowlist policy and custom-rule test contract. `oxlint.config.ts` will own
  the concrete file list, not architecture documentation.
- `docs/architecture/frontend.md` owns loader/action/adapter placement and
  typed React composition. React render functions, leaf components and
  ordinary hooks do not own decoding, runtime execution or service lookup.
- The selected input schema and continuation must be coupled before a
  heterogeneous calculator catalogue erases the generic. This is a
  policy-owning constructor, not permission for generic decode helpers.

## Risks and follow-up work

- A syntax-level lint rule cannot prove arbitrary runtime data flow or dynamic
  property aliases. DECODE-002 will cover statically traceable forms and record
  unsupported dynamic forms as residual risk.
- Exact file allowlisting can accidentally exempt React render code in mixed
  `.tsx` modules. DECODE-004 must move docs transport decoding to a loader or
  dedicated adapter rather than allowlist the route component.
- DECODE-003 must preserve two required calculator boundaries: the Effect HTTP
  route union and selected catalogue schema. Only the rule scenario re-decode
  is prohibited.
- The existing docs-content static source-path decodes need a separate
  placement review. They are not silently reclassified as boundaries.

## Changeset decision

No Changeset is required. DECODE-001 changes repository rules, durable
architecture docs and implementation planning only; it does not change a
package export, accepted public input, package-facing behaviour or release
artifact. Do not run `bun run version-repo`.

## Quality audits

### Audit pass 1: factual inventory and call graphs

- Completed the repository-owned decoder scan with generated/dependency/build
  exclusions and classified all 42 executable operations above.
- Confirmed the required route-union, selected-calculator, scenario-layer, SDK
  descriptor and docs render-time locations.
- Corrected the spec graph wording from a literal cast to the actual erased
  continuation call.

### Audit pass 2: architecture contract

- Kept allowed external trust, public unknown-input, external-library
  normalisation, dynamic type-erasure and focused-test categories distinct from
  internal/repeated decoder findings.
- Documented one linear Effect shape: decode, inline typed error handling and
  typed continuation, without nested runtime execution, unsafe casts or
  decoder/error wrapper sprawl.
- Documented that catalogue construction preserves
  `InputSchema["Type"]` before heterogeneous storage.

### Audit pass 3: documentation review

- Reviewed the documentation standards suite and new-contributor journey.
- Kept architecture pages as durable maintainer reference and this page as
  execution evidence.
- Checked reader fit, Australian spelling, sentence-case headings, canonical
  names, links, source-of-truth ownership and banned marketing language.

## Validation log

Completed DECODE-001 gates:

```bash
# Completed with 0 issue(s).
bun run docs:validate

# Completed: Oxlint, formatting, Knip and workspace type checks passed.
bun run verification

# Completed: task list is valid JSON.
jq empty docs/product-specs/boundary-only-decoding.tasks.json

# Completed: no whitespace errors.
git diff --check
```

`bun run format:check` also passed during the documentation review. No
browser-visible behaviour changed. The proposed rule remains repository-wide:
it will cover browser app and browser-safe SDK source without package-level or
filename-pattern exemptions. The frontend target graph keeps executable
decoding and runtime/service ownership in loaders, actions or dedicated
adapters, outside React render functions, leaf components and ordinary hooks.

This task intentionally does not add the lint rule or refactor runtime code.

## Parent acceptance

DECODE-001 was accepted after one correction turn.

- Audit pass 1: parent reran the repository-owned decoder scan and confirmed
  the 42-operation inventory, including the required calculator, SDK and docs
  render-time locations.
- Audit pass 2: parent confirmed that the durable docs distinguish trust,
  external-library, type-erasure and focused-test boundaries from repeated
  internal decoding. Exact allowlist paths remain owned by `oxlint.config.ts`.
- Audit pass 3: parent reviewed sentence-case headings, reader fit, canonical
  Effect names, links and source-of-truth ownership against the documentation
  standards suite.
- Correction turn 1: aligned the active-plan frontend target graph with the
  SPEC: leaves receive focused readonly values, callbacks or children, not
  only typed props.

The parent reran `bun run docs:validate`, `bun run verification`, JSON
validation and `git diff --check`. No Changeset is required because this slice
changes repository guidance and execution evidence only.
