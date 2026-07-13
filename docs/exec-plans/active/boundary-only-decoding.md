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
| DECODE-002 | accepted | Repository-wide decoder placement rule, exact transitional allowlist and CLI integration suite are complete. |
| DECODE-003 | accepted | Catalogue dispatch now owns the selected decode and enters typed scenario continuations directly; SDK descriptor decoding is direct. |
| DECODE-004 | accepted | Docs route loaders decode transport into typed Results before route composition. |
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

## DECODE-002 implementation

### Rule and exemption contract

`whattax/no-decoding-outside-boundaries` is enabled repository-wide through
`tools/oxlint/whattax-rules.js`. It uses Oxlint AST bindings to report:

- all supported Effect Schema runtime decoder families, including Effect,
  Exit, Option, Result, Promise and Sync forms
- direct decoder helpers and static member calls named `decode` or beginning
  `decode` followed by an uppercase letter, including platform operations such
  as `Stream.decodeText`
- renamed `Schema` imports from `effect`, namespace and named imports from
  `effect/Schema`, statically computed members, decoder factory extraction,
  destructuring and static local aliases

It deliberately permits encoding, schema declaration fields and declarative
`Schema.decodeTo`. Dynamic property keys and aliases that cannot be resolved
from the local AST remain a syntax-level residual risk; they require review.

`oxlint.config.ts` owns one named `decodingBoundaryFiles` list, grouped into
application/configuration, docs, public API/test, focused lint-test, dynamic
dispatch and SDK/process categories. The override disables only this new rule
for exact paths. It does not use `ignorePatterns`, package-wide globs,
runtime-name globs, test globs or nested configuration. The two repeated rule
scenario files remain explicitly transitional entries for DECODE-003; the
mixed docs route boundary remains an explicit transitional entry for
DECODE-004.

The canonical `lint` command now passes `--disable-nested-config` to both
Oxlint invocations. Its first pass runs the rule as allowed with
`--report-unused-disable-directives-severity=error`; this causes parsed
`eslint-disable` and `oxlint-disable` directives naming the rule to fail as
unused. Exact configuration overrides are therefore the only exemption
mechanism.

### Test coverage

`tools/oxlint/no-decoding-outside-boundaries.test.ts` runs the real Oxlint CLI
with the repository config and `--disable-nested-config`. It proves:

- fourteen Effect Schema family/direct-helper diagnostics
- seven distinct renamed, namespace, static-computed, factory, alias,
  destructuring and platform-member diagnostics
- TSX component and hook decoder calls are rejected outside the allowlist
- encoding and `Schema.decodeTo` are not false positives
- a decoder in the exact `apps/api/src/config.ts` override passes
- file, next-line and line `eslint-disable` and `oxlint-disable` forms fail
  through comment tokens, while identical string-literal text does not

The focused suite is part of the root `bun run test` command.

### Changeset decision

No Changeset is required. This is repository-internal lint configuration,
test wiring and execution evidence; it changes no package export, package
contract, release artifact or public user-facing behaviour. Do not run
`bun run version-repo`.

### Quality audits

#### Audit pass 1: AST matching and false positives

- Reviewed the plugin's import, member and local-binding tracking against all
  required Effect Schema decoder families and generic `decode*` members.
- Confirmed the dedicated tests assert the expected diagnostic counts, rather
  than merely proving that an unrelated decoder in the same fixture fails.
- Confirmed `Schema.decodeTo`, encoding and schema declaration fields remain
  outside the executable-decoder match.

#### Audit pass 2: exact configuration boundary

- Reviewed `decodingBoundaryFiles`: every entry is an exact source path from
  the DECODE-001 inventory or the focused CLI test's process-output boundary.
- Confirmed the sole override disables only
  `whattax/no-decoding-outside-boundaries`; no boundary source was added to
  `ignorePatterns` and the only remaining file glob is the pre-existing
  calculator policy override.
- Confirmed both root lint passes use `--disable-nested-config`.

#### Audit pass 3: test and maintenance fit

- Confirmed the focused test uses the real bundled Oxlint binary and root
  configuration, not visitor-callback stubs.
- Confirmed temporary fixture cleanup, deterministic report-count assertions
  and the parsed-comment suppression audit without raw source-text searches.
- Reviewed new alias-tracking helpers as specific reusable matching policy;
  no DTOs, unsafe casts, runtime wrappers or Effect helper abstractions were
  introduced.

### Validation log

Completed DECODE-002 gates:

```bash
# 7 focused real-CLI tests passed.
bun run test:oxlint

# Root test path passed, including the focused Oxlint suite.
bun run test

# Root lint passed with the comment-token pass and nested configs disabled.
bun run lint

# Formatting, Knip and workspace type checks passed.
bun run verification

# Valid JSON and no whitespace errors.
jq empty docs/product-specs/boundary-only-decoding.tasks.json
git diff --check
```

No browser-visible behaviour changed. Normal root lint covers browser app and
browser-safe SDK source without broad exemptions.

## Parent acceptance

DECODE-002 was accepted without a correction turn after local recovery from a
non-producing subagent attempt.

- Audit pass 1: parent inspected the AST rule and verified required decoder,
  alias, TSX, false-positive and comment-token cases through the real CLI.
- Audit pass 2: parent inspected the exact categorised allowlist, confirmed
  the rule is globally enabled and checked that no broad exemption or
  `ignorePatterns` entry was introduced.
- Audit pass 3: parent verified root test wiring, temporary fixture cleanup,
  deterministic diagnostic-count assertions and the no-Changeset rationale.

## DECODE-003 implementation and acceptance

The calculator catalogue now uses `defineCalculatorCatalogEntry` to close each
canonical `InputSchema` over a continuation accepting exactly
`InputSchema["Type"]` before storing an erased catalogue entry. Its stored
boundary is one linear pipe: selected schema decode, then the constructor-closed
typed continuation. `PublicCalculatorServiceLive` maps only the resulting
`Schema.SchemaError` inline to `CalculatorInputDecodeError`; calculation errors
remain typed and unchanged.

Rule packages expose `TakeHomeScenarioLiveFromInput` and
`AnnualTaxScenarioLiveFromInput` for internal typed composition. Their existing
unknown-input constructors remain explicit, tested boundary adapters in their
own `*.boundary.ts` modules. The catalogue uses only the typed constructors, so
selected facts are not decoded a second time. The exact lint allowlist now
contains the catalogue constructor and those boundary modules, and no longer
contains the former mixed scenario files or calculator live layer.

`defineSdkCalculation` now uses `Schema.decodeUnknownEffect` directly. The
descriptor boundary remains schema-backed, but no longer decodes to `Exit` only
to immediately lift it back into `Effect`.

The calculator type-test program proves a take-home schema cannot be paired
with an annual-tax continuation. It is checked by the new calculator
`test-types` command and is intentionally outside Vitest's runtime test file
pattern.

### Quality audits

- Audit pass 1: verified selected schema decode flows into the constructor-closed
  typed continuation, with no catalogue execution call to a rule boundary
  decoder.
- Audit pass 2: verified the calculator boundary maps only `Schema.SchemaError`
  inline and preserves `CalculationError`; no unsafe casts, broad catches or
  runtime wrappers were added.
- Audit pass 3: verified canonical schemas/types and package exports, direct SDK
  decoder use, browser-safe SDK import checks and the compile-time mismatch
  fixture.

### Changeset decision

`.changeset/boundary-only-decoding.md` records minor releases for the additive
calculator and rule-package typed scenario exports and a patch for the SDK
decoder simplification.

## DECODE-004 implementation and acceptance

Docs server functions still encode the canonical `Schema.Exit` transport
codec, but `loadDocsHome` and `loadDocsPage` now call the route boundary's
`decodeToResult` adapter before returning loader data. That adapter performs
Schema decode, maps malformed transport to `DocsRouteTransportError`, converts
expected typed failures into `Result.fail`, and preserves the existing defect
policy outside React. Route components use `Result.match` on typed loader data;
they no longer import a decoding matcher or execute a decoder during render.

The route-boundary test covers encoded success, `DocsContentPreloadError`,
`DocsPageNotFoundError`, `DocsSourceError`, and malformed transport. It is
wired into root `bun run test`. No runtime, service acquisition, transport
decode or external representation read was added to routes or leaf components.

### Quality audits

- Audit pass 1: confirmed loader data is a typed `Result` before React
  composition and malformed transport has its own tagged failure.
- Audit pass 2: confirmed Cause traversal and defect policy remain in the
  boundary adapter, while the existing module-scoped server runtime remains the
  only loader runtime owner.
- Audit pass 3: confirmed route components use focused typed result branches,
  no generic decode/match wrapper remains in render, and no visual or navigation
  content was changed apart from accurate malformed-transport presentation.

### Changeset decision

No Changeset is required. DECODE-004 changes only app-internal docs loader
composition, focused test wiring and execution evidence; it changes no package
export or package-facing public contract.
