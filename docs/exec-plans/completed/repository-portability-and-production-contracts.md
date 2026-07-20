---
document_type: execution-plan
lifecycle: historical
authority: supporting
owner: taxkit-execution-history-owner
last_reviewed: 2026-07-20
review_trigger: historical rollout, proof, or successor correction
successor: null
tombstone: false
---

# Repository Portability and Production Contracts Execution Plan

Spec:
[Repository portability and production contracts](../../product-specs/repository-portability-and-production-contracts.md)

Task list:
[`repository-portability-and-production-contracts.tasks.json`](../../product-specs/repository-portability-and-production-contracts.tasks.json)

## Goal

Implement the task list one task at a time with exactly one sequential
subagent per task. The parent agent owns review, three-pass improvement audits,
independent verification and final acceptance before delegating the next task.
Return corrections to the same subagent; after a third failed correction turn
for one task, stop the rollout and record a blocker for replan or user
decision. Do not publish packages or run `version-repo`.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| RPC-001 | complete | Parent accepted correction turn 1 after focused, frozen-lockfile, repository-wide and root-test verification. |
| RPC-002 | complete | Parent accepted correction turn 1 after decision-neutral compatibility review and independent repository verification. |
| RPC-003 | complete | Parent accepted correction turn 1 after inline-policy enforcement and independent real-binary verification. |
| RPC-004 | complete | Parent accepted correction turn 1 after production controls, internal API cleanup and independent full-root verification. |
| RPC-005 | complete | Parent accepted the decision-only slice after independently reproducing the contradictions, reviewing compatibility and exact scope, and rerunning every mandatory gate. |
| RPC-006 | complete | Parent accepted the implementation candidate without a correction turn after focused, packed-consumer, API-smoke and full-root verification. |

## Decision Log

### 2026-07-19 explicit approval

The user stated: “Approve all. Don’t stop for my approval, I have already
approved the full SPEC.” This is explicit approval of the previously presented
recommended options 1A, 2A and 3A, and of the full-SPEC CORR-003 and CORR-004
corrections. It is not inferred from repository state.

### STR-DEC-001 - resolved as 1A

Tighten the existing exported `IsoDate` Schema so runtime decoding validates
`YYYY-MM-DD` syntax and a real Gregorian calendar date; the `isoDate`
constructor uses the same invariant. Installed Effect `4.0.0-beta.98` proves
brand-only decoding accepts arbitrary strings, and live evaluation proved the
current `Date.parse` constructor check also accepts normalized `2026-02-29`.
RPC-006 records this as a breaking accepted-input correction with a major
`@taxkit/core` Changeset.

### REL-DEC-001 - resolved as 3A

Add `@taxkit/calculators` to the Changesets fixed group. All nine strict
downstream artifact manifests are already `1.0.0`, and the validator already
contains calculators in its exact closure. RPC-006 edits only the Changesets
config and versioning standard for this policy; the edit itself has no package
Changeset and no version is applied.

### STR-DEC-002 - resolved as 2A

The two public fields represent independent owner-defined stable ruleset
versions, initially `rules-au-income-tax/1.0.0` and `rules-au-pay/1.0.0`, not
package semver. No runtime manifest read or generic version package is allowed.
The exact-value audit found only the two owner literals; current calculator,
HTTP, SDK, app-smoke and strict-downstream consumers do not assert either value,
and OpenAPI records the fields only as strings. RPC-006 makes the owner Schemas
exact, adds assertions across those boundaries, records major Changesets for
both rule packages and updates the public API app changelog.

### Full-SPEC corrections - approved

CORR-003 sanitizes the calculator Schema formatter's rejected-value message
while preserving tags, typed paths and help. A live probe reproduced both a
secret token and private path in the current message. CORR-004 replaces the
plain SDK's public `Cause.pretty` projection with stable safe messages while
retaining typed error detail. Their exact files, patch Changesets, tests and API
changelog consequence are closed in RPC-006 `resolvedScope`.

## RPC-003 Portable Effect lint decision matrix

The pre-edit inventory compared the current TaxKit plugin graph, configured
allowlists and live source with each candidate. The admitted non-website scope
is an explicit owner list in `oxlint.config.ts`: `apps/api`; the API HTTP,
calculators, core, docs-content, docs-fumadocs, three rule, scripts, SDK and
testing package trees; and the effect-language-service, Oxlint,
repository-paths and skills tool trees. Current source has five bare
`Effect.tryPromise` calls, all under the excluded `apps/docs` website surface;
the admitted scope therefore has zero source migrations. Passing root lint
confirms zero current violations for the already-enabled owners.

| Candidate ID | Candidate and current overlap | Static signal, exact scope and fixture cases | Migration count | Decision |
| --- | --- | --- | --- | --- |
| `EFF-TRY-001` | Bare `Effect.tryPromise`; no current TaxKit rule owns explicit rejection mapping. | Resolve `Effect.tryPromise` from root/namespace/subpath imports, renamed bindings, static destructuring/aliases and reassignment. Reject callback, missing, extracted, shorthand, non-function, spread and non-inline policy; accept direct inline arrow/function/method-valued `try` and `catch` properties plus unrelated shadowed locals in the admitted non-website scope. | 0 in scope; 5 website calls intentionally untouched. | **Admit** as `effect/no-bare-effect-try-promise`. |
| `HOST-001` | Host APIs in service/config/schema/error contracts overlap `effect/no-host-imports-in-contracts`; Bun value use overlaps `bun/no-host-api-outside-adapters`. | Existing contract-file globs reject Node/Bun/platform imports, while the global Bun rule resolves global aliases/destructuring/reassignment and exact adapter files disable only that owner. Accepted live/layer adapters and unrelated shadowed globals remain valid. | 0 | **Reject duplicate**; retain both existing owners and scopes. |
| `RUNTIME-001` | Adapter execution without an explicit boundary overlaps `effect/no-runtime-execution-outside-boundaries` and `bun/no-runtime-outside-entrypoints`. | Existing binding-aware rules resolve direct/namespace imports, aliases, destructuring and reassignment; exact runtime/entrypoint files are already listed. | 0 | **Reject duplicate**; the Effect owner covers all runtime methods and `ManagedRuntime.make`, while the Bun owner keeps `runMain` entrypoint-specific. |
| `NULL-001` | Nullable boundary leakage partially overlaps calculator-scoped `taxkit/no-nullish-comparison`. | A raw `null`, `Schema.NullOr`, object `null` or `Option.getOrNull` occurrence does not by itself prove an internal leak: protocol Schemas and exact adapters legitimately own nullable representations. Type/flow-aware ownership is unavailable to the plugin. | 0 | **Reject** as unreliable outside the existing calculator policy; retain review guidance and the stricter calculator rule. |
| `OUTCOME-001` | Manual `Result`/`Exit` re-encoding has no direct TaxKit rule; `effect/no-manual-tag` already rejects every manual `_tag` object. | Literal tags such as `Success`, `Failure` and `Error` can be legitimate owner-named domain vocabularies. Without type/provenance analysis, tag-name matching would create false positives and duplicate the safe structural `_tag` ban. | 0 | **Reject**; use owner Schema review and the existing manual-tag rule. |
| `CODEC-001` | Non-throwing synchronous decoder placement is already covered by repository-wide `taxkit/no-decoding-outside-boundaries`; throwing codecs are covered by `effect/no-throwing-schema-sync-codec`. | The TaxKit rule already resolves Schema imports, aliases, destructuring and decoder factories and permits only exact `decodingBoundaryFiles`. `effect/no-schema-encoder-outside-egress` independently preserves explicit egress. | 0 | **Reject duplicate**; do not weaken or move decoder ownership. |
| `CALC-001` | `no-typeof`, `no-instanceof`, `no-in-operator`, `no-undefined-comparison`, `no-nullish-comparison`, `no-conditional-object-spread` and `no-context-nullish-default`. | These encode calculator request/context and tagged-domain policy or need type/flow knowledge to distinguish host/adapter code. | 0 | **Retain in `taxkit`**; no portable move. |
| `CALC-002` | `no-native-array-methods`, `no-nested-wrapper-calls`, `no-native-collections`, `no-throw`, `no-async-await-promise`, `no-json-parse-stringify` and `no-ambient-time-or-random`. | The concepts can be portable, but the current visitors match unbound global/identifier names or syntax without proving Effect-owned scope. Broadening would report unrelated shadows or valid boundary mechanics. | 0 | **Retain in calculator scope** until a separate binding/provenance design proves exact semantics. |
| `ROUTE-001` | Route-loader mapper policy is website-specific and overlaps the separate strict route transport consumer owner. | Website and route files are explicit RPC-003 N/A surfaces. | 0 | **Reject from this rollout**; do not add or move route rules. |

### RPC-003 pre-edit downstream impact ledger

| Surface | Decision | Path evidence |
| --- | --- | --- |
| Active plan | Change required | This plan records the pre-edit matrix, implementation candidate, verification and three audits. |
| Product spec, task list and index | N/A for RPC-003 | The canonical artifacts already define the admitted-or-zero outcome, exact candidate set, verification and dependencies; implementation discovered no changed requirement or new task. Concurrent governance hunks are preserved. |
| Canonical docs and standards | Change required | `docs/architecture/effect-services.md`, `docs/architecture/testing-and-quality.md` and `docs/standards/code-patterns.md` must describe the admitted rejection-mapping contract and rejected review-only cases. |
| Lint rules, fixtures and exact config | Change required | `tools/oxlint/effect-rules.js`, a focused rule test, the three Effect fixture classes, `portable-rules.test.ts` and `oxlint.config.ts` own the one admitted rule. |
| Bun/TaxKit rules and binding tracker | N/A unless implementation disproves the matrix | Existing owners and `tools/oxlint/binding-tracker.js` already supply the required semantics; no namespace move or new binding abstraction is admitted. |
| Root/package READMEs, manifests, exports, schemas, generators and migrations | N/A | The admitted scope has zero source migrations and changes no package contract or runtime artifact. |
| Skills, AGENTS, instruction metadata and CI | N/A | Concurrent governance edits are preserved; `.github/workflows/quality.yml` already inherits root lint through verification. |
| Provider/API/SDK/storage/command/observability/deployment | N/A | This is static tooling with no provider, transport, storage or operator behavior change. |
| React, website, route, accessibility and browser proof | N/A | `apps/docs`, `apps/web` and route-loader policy are explicitly excluded. |

## RPC-002 String-contract audit ledger

### Scope and method

The audit starts from the export and command surfaces declared by the nine
artifact manifests: `@taxkit/core`, the three AU rule packages,
`@taxkit/calculators`, `@taxkit/api-http`, `@taxkit/sdk`, `@taxkit/testing` and
`@taxkit/tsconfig`. It also covers the exported and executable command
contracts of `@taxkit/scripts` and the configuration, runtime and smoke-command
contracts of `apps/api`. Rows include string-shaped exported Schemas, public or
generic constructor inputs, configuration, explicit encoded contracts and
diagnostic egress. Ordinary implementation literals, Schema tags, endpoint
names, fixture text and environment-key names are excluded.

Installed `effect@4.0.0-beta.98` is authoritative: `Schema.brand` changes the
nominal `Type` without adding runtime checks; `Schema.RedactedFromValue` decodes
raw input to a redacted `Type`; `Schema.Redacted` accepts a value that is
already redacted. No audited owner currently has a secret Schema.

| ID | Owning module / Schema; field | Exposure boundary | Current -> proposed category | Runtime constraint | Brand identity | Type | Encoded | Constructor | Ingress decode | Egress encode | Compatibility | Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CORE-01 | `packages/core/src/primitives/date.ts` `IsoDate`; value | Public primitive and `DateInterval` transport/persistence field | open semantic -> checked open semantic | Approved: one runtime `YYYY-MM-DD` and real Gregorian-date check shared by Schema and constructor | `taxkit/IsoDate` | branded `string` | `string` | `IsoDate.make` for trusted values; `isoDate(string)` validates | Owning Schema at external boundaries; constructor for raw public call | `DateInterval`/artifact/trace owners encode at their egress | Intentional breaking narrowing; valid Type/Encoded shape stays stable | **Approved 1A; implement CORR-001 in RPC-006** |
| CORE-02 | `date.ts` `DateInterval.from`, `toExclusive`; `dateInterval` arguments | Public constructor and encoded effective periods | checked content -> checked content | approved real-date invariant plus interval order | inherited `taxkit/IsoDate` | `IsoDate`, optional `IsoDate` | `string`, optional `string` | `dateInterval({ from, toExclusive })` accepts `string \| IsoDate` | constructor parses raw strings; Schema decode follows `IsoDate` | owning Schema at API/trace/persistence egress | Invalid dates now fail before interval ordering; recursive/encoded consumers remain canonical | **Approved 1A; focused compatibility proof in RPC-006** |
| CORE-03 | `primitives/tax.ts` `CalculatorId`, `Jurisdiction`, `TaxYear`; raw constructor values | Public identifiers and catalog/context fields | open semantic -> open semantic | none at generic owner; rule owners close supported values with literals | `taxkit/CalculatorId`, `taxkit/Jurisdiction`, `taxkit/TaxYear` | respective branded `string` | `string` | `calculatorId`, `jurisdiction`, `taxYear`; `.make` for trusted literals | concrete rule/calculator/API Schemas decode unknown input | owning response/request Schema | Adding generic lexical checks without a stable cross-owner invariant would reject existing consumers | **Keep** |
| CORE-04 | `tax.ts` `taxRate(value)`, `decimalCoefficient(value)` | Public textual parser input | transport primitive -> transport primitive | Effect `BigDecimal` parser; output Schema is numeric, not string-shaped | output brands `taxkit/TaxRate`, `taxkit/DecimalCoefficient` | branded `BigDecimal` | `BigDecimal` representation | named parser constructors | constructor is the explicit textual ingress | owning numeric Schema at transport egress | No separate string contract is exported | **Keep** |
| CORE-05 | `money.ts` `Currency`; `rounding.ts` `RoundingMode`; `facts/descriptor.ts` `FactAuthority`, `FactQuestionInputKind`; `rules/descriptor.ts` `RuleSourcePolicy`; `trace/node.ts` `SourceKind`; `ledger/component.ts` `ComponentEffect`, `ComponentStatus`; `graph/rule-graph.ts` `GraphValidationIssueKind`; `tax.ts` infinity sentinel | Public closed domains | closed vocabulary -> closed vocabulary | exact literal membership | none; semantic closure is sufficient | literal unions | same literal unions | Schema `.make` or trusted literal | owning Schema at request/transport boundary | owning Schema at report/trace/API egress | Closed values remain exhaustive and non-stringly | **Keep** |
| CORE-06 | `facts/descriptor.ts` `FactId`, `FactQuestionId`; `parameters/descriptor.ts` `ParameterId`; `trace/node.ts` `RuleId`, `SourceChecksum`; `ledger/component.ts` `ComponentId` | Public descriptor, trace and ledger identities | open semantic -> open semantic | none; checksum algorithm/prefix is not promised as runtime validation | owner-specific `taxkit/*` brands | branded `string` | `string` | owner `.make`, descriptor constructors, `sourceChecksum` | decoded through enclosing exported Schema when external | encoded through enclosing descriptor/trace/ledger owner | Mechanical lexical checks would invent policy; brand prevents cross-ID mixing | **Keep** |
| CORE-07 | `facts/descriptor.ts` `FactQuestion.helpText`, `prompt`; descriptor `title`; `parameters/descriptor.ts` title; `rules/descriptor.ts` title | Public authored/display metadata | checked content -> checked content | optionality only; no reusable content invariant | none | `string`, optional `string` | same | `FactQuestion` and owner descriptor constructors | trusted repository metadata; enclosing Schema when transported | calculator metadata/API response Schemas | Named content brands would add schema sprawl without mixing protection | **Keep** |
| CORE-08 | `facts/descriptor.ts`/`parameters/descriptor.ts`/`rules/descriptor.ts` constructor `id` and `title` inputs | Public generic descriptor constructor | open semantic + checked content -> same | IDs gain owner brand; titles have no extra constraint | output owner ID brand only | raw `string` input -> branded ID/content output | IDs encode as `string`; titles as `string` | `makeFactDescriptor`, `makeParameterDescriptor`, `makeRuleDescriptor` | trusted definition-time boundary, not unknown ingress | metadata/API owner encodes projected values | Generic interfaces preserve schema/layer inference and are not DTO mirrors | **Keep** |
| CORE-09 | `trace/node.ts` `SourceRef.reference`, `title`; `SourceExtract.shape`; `SourceArtifact.documentVersion` | Public source evidence and serialized metadata | transport primitive/content -> same | `reference` deliberately supports citation/URL forms; other fields unconstrained content | none | `string` | `string` | owning Schema `.make`/classes | trusted rule data or enclosing Schema decode | trace/parameter metadata egress | No one lexical rule fits all citation references or document versions | **Keep** |
| CORE-10 | `trace/node.ts` `TraceNode.ruleId`, `title`, `formula`, `inputs` keys and `TraceNodeEncoded` counterparts | Recursive public transport/persistence codec | open semantic/content/transport -> same | owner ID brand; optional formula; record keys unconstrained | `taxkit/RuleId` only | branded ID plus content strings | raw string ID/content/keys | `TraceNode.make` through Schema codec | enclosing trace decode at external representation boundary | explicit owning recursive encoder | `TraceNodeEncoded` is necessary recursive representation, not a DTO mirror | **Keep** |
| CORE-11 | `ledger/component.ts` `LedgerComponent.id`, `label` and `LedgerComponentEncoded` | Public ledger transport/persistence codec | open semantic + content -> same | ID nominal only; label unconstrained display content | `taxkit/ComponentId` | branded ID, `string` label | raw string ID/label | `LedgerComponent.make` through codec | enclosing ledger decode | explicit owning ledger encoder | Explicit encoded form preserves nested codec types | **Keep** |
| CORE-12 | `graph/rule-graph.ts` `GraphValidationIssue.message`; `errors/calculation-error.ts` `CalculationError.message` | Package/API diagnostics | diagnostic text -> diagnostic text | generated from canonical graph IDs or owning calculation failures; no nominal safety | none | `string` | `string` | tagged Schema class constructors | internal generation | calculator/API/SDK error egress | Safety depends on generators; no secret/provider surface currently reaches these constructors | **Keep; sentinel coverage joins any diagnostic correction** |
| RULE-IT-01 | `packages/rules/au/income-tax/src/calculator/metadata.ts` calculator ID, jurisdiction, tax year and context | Public rule-owned catalog context | closed vocabulary with owner brand -> same | exact supported literals | canonical core identity brands | branded literal unions | literal strings | `.make` on trusted catalog literals | calculator/API Schema decodes external context | calculator/API response encoder | Correctly narrows generic core IDs | **Keep** |
| RULE-IT-02 | `calculator/annual-tax.ts` `AnnualTaxReport.rulePackVersion` | Public report and API/SDK transport | unchecked public encoded value -> closed stable ruleset version | owner-defined exact `rules-au-income-tax/1.0.0`, independent of package semver | none | literal string | literal string | `AnnualTaxReport` constructor | internal report generation | calculator/API/SDK response encoding | Observable value and constructor narrowing; no current exact-value assertion found | **Approved 2A; implement CORR-002 in RPC-006** |
| RULE-IT-03 | Exported fact/parameter/rule descriptors, source refs/artifacts and Rule/Component IDs across `facts/*`, `parameters/*`, `rules/*`, `rule-pack/descriptors.ts` | Public static rule metadata | inherited open semantic/content/transport -> same | only canonical core owner constraints | canonical core brands | canonical core Types | canonical core Encoded strings | core constructors and `.make` on trusted literals | repository-owned static definitions | calculator metadata/trace egress | No rule-local mirror or new string policy | **Keep** |
| RULE-PAY-01 | `packages/rules/au/pay/src/calculator/metadata.ts` calculator ID, jurisdiction, tax year and context | Public rule-owned catalog context | closed vocabulary with owner brand -> same | exact supported literals | canonical core identity brands | branded literal unions | literal strings | `.make` on trusted catalog literals | calculator/API Schema decodes external context | calculator/API response encoder | Correctly narrows generic core IDs | **Keep** |
| RULE-PAY-02 | `facts/pay.ts` `PayPeriod`; `parameters/schedule1.ts` `Schedule1Scale` | Public calculation/table modes | closed vocabulary -> closed vocabulary | exact literal membership | none | literal unions | same | Schema/class constructors | scenario/table Schema decode | report/table encoding | Existing `Match` branching remains exhaustive | **Keep** |
| RULE-PAY-03 | `calculator/take-home-pay.ts` `TakeHomePayReport.rulePackVersion` | Public report and API/SDK transport | unchecked public encoded value -> closed stable ruleset version | owner-defined exact `rules-au-pay/1.0.0`, independent of package semver | none | literal string | literal string | `TakeHomePayReport` constructor | internal report generation | calculator/API/SDK response encoding | Observable value and constructor narrowing; no current exact-value assertion found | **Approved 2A; implement CORR-002 in RPC-006** |
| RULE-PAY-04 | Exported fact/parameter/rule descriptors, source refs/artifacts and Rule/Component IDs across `facts/*`, `parameters/*`, `rules/*`, `rule-pack/descriptors.ts` | Public static rule metadata | inherited open semantic/content/transport -> same | only canonical core owner constraints | canonical core brands | canonical core Types | canonical core Encoded strings | core constructors and `.make` on trusted literals | repository-owned static definitions | calculator metadata/trace egress | No rule-local mirror or new string policy | **Keep** |
| RULE-STSL-01 | Exported fact/parameter/rule descriptors, source refs/artifact and Rule/Component IDs across `packages/rules/au/stsl/src` | Public static rule metadata | inherited open semantic/content/transport -> same | only canonical core owner constraints | canonical core brands | canonical core Types | canonical core Encoded strings | core constructors and `.make` on trusted literals | repository-owned static definitions | calculator metadata/trace egress | STSL defines no separate exported string Schema | **Keep; owner-local string Schema N/A** |
| CALC-01 | `packages/calculators/src/schemas.ts` composed calculator IDs, jurisdictions, tax years, contexts and request fields | Public service/API/SDK request/response | closed vocabulary with owner brands -> same | union of exact rule-owned literals | inherited core identity brands | branded literal unions/structs | literal strings/structs | enclosing Schema `.make`/Data classes | HTTP/SDK boundary decodes complete request | response owner encodes complete representation | Reuses rule owners; no duplicate ID Schema | **Keep** |
| CALC-02 | `schemas.ts` `HelpMode`, authority/source policy inherited fields | Public request/response modes | closed vocabulary -> closed vocabulary | exact literals | none | literal unions | same | owning Schema | HTTP query decode | response encode | No stringly branch expansion required | **Keep** |
| CALC-03 | `catalog.ts` entry `description`, `reportSchemaName`, `title`; `schemas.ts` catalog/jurisdiction/descriptor `description`, `title`, `schemaTag`, `reportSchemaName` | Public catalog/metadata content and transport labels | checked content/transport primitive -> same | no independent content constraint; schema tag/name are emitted identifiers but not caller inputs | none | `string` | `string` | catalog definition + Schema-derived Data classes | trusted repository catalog | calculator/API response Schema | Branding display strings or AST tags would add sprawl; generic catalog interfaces preserve schema coupling | **Keep** |
| CALC-04 | `schemas.ts` `CalculatorInputIssue.message`, `path`; calculator error `message`; `UnsupportedCalculatorError.requestedCalculator` | Public API/SDK diagnostics | diagnostic text/transport path -> safe diagnostic text/transport path | approved stable message excludes rejected values; path remains normalized strings | none | `string`, `readonly string[]` | same | tagged Schema class constructors | `errors.ts` converts Schema issue at calculator boundary | API and SDK error encoding | Observable message correction preserves tags/paths/help | **Full-SPEC approved; implement CORR-003 in RPC-006** |
| CALC-05 | `schemas.ts` `SourceRef`, descriptor IDs/titles, `FactQuestion`, effective periods and graph diagnostics reused in metadata responses | Public metadata transport | canonical inherited categories -> same | canonical owner constraints | canonical core brands | canonical core Types | canonical core Encoded | owner constructors/Data projections | internal typed descriptor projection | calculator/API response encoding | Correct owner reuse; no DTO/string mirror | **Keep** |
| CALC-06 | `catalog.ts` `CalculatorCatalogEntryDefinition` and dynamic `calculate(facts)` | Generic type-erasure boundary | schema-coupled generic interface -> same | selected input Schema closes over continuation | none beyond field owners | schema-specific Type | enclosing request Encoded | `defineCalculatorCatalogEntry` | selected Schema decodes once after heterogeneous lookup | response owner encodes | This is a required generic boundary, not a DTO mirror or repeated defensive decode | **Keep** |
| API-01 | `packages/api/http/src/config.ts` `TaxKitHttpApiClientConfigSchema.baseUrl` | Exported package config/provider egress | transport primitive -> transport primitive | valid URL | none | `URL` | `string` | Schema `.make` after `Config.url` | Effect Config parses URL once | provider/client adapter consumes Type; no serialization here | Correct Type/Encoded distinction | **Keep** |
| API-02 | `groups/health.ts` `HealthResponse.service`, `status`; calculator group schemas | Public HTTP response/request | closed vocabulary/canonical reused contracts -> same | exact health literals and calculator owner constraints | inherited where applicable | literal/canonical Types | literal/canonical Encoded | HTTP API Schema | HttpApi decodes request representations | HttpApi encodes responses | No local calculator DTOs | **Keep** |
| API-03 | API/OpenAPI endpoint/group names, paths, titles and descriptions | Declarative framework metadata | implementation literals -> excluded | framework-owned declaration | none | N/A | N/A | declarative builders | N/A | generated OpenAPI | Not exported value fields or constructor/config contracts | **N/A** |
| SDK-01 | `packages/sdk/typescript/src/errors.ts` all `message` fields; `Cause.pretty` projection | Public SDK failure diagnostics | raw diagnostic text -> safe diagnostic text | approved stable outer/schema/unexpected messages; no raw Cause rendering | none | `string` | `string` | Schema-tagged error constructors | calculator/Schema Cause converted at SDK boundary | rejected Promise/safe result and exported error Schema | Observable message hardening preserves tags and typed details | **Full-SPEC approved; implement CORR-004 in RPC-006** |
| SDK-02 | `types.ts` `SdkCalculation` ID/jurisdiction/year; `TaxKitModule.id` | Public generic SDK descriptor | canonical identities + generic module identity -> same | calculation values use rule literals; module `id` retains literal generic | inherited brands except module ID | branded literals; generic `Id extends string` | strings | `defineSdkCalculation`, `defineTaxKitModule` | trusted exported descriptors | SDK calls through calculator service | Generic interface preserves inference and is not a DTO mirror; no mixing defect proven for module ID | **Keep** |
| SDK-03 | `effect.ts` generic request/response Omit projections | Public SDK Effect facade | canonical transport contracts -> same | preserves calculator Schemas and selected report decoder | inherited | canonical Types with generic report/input | canonical Encoded through owner | SDK functions | calculator service owns request decode; selected report decoder runs once at type-erasure boundary | API/SDK caller owns external egress | Projection preserves generic report coupling; no duplicated string fields | **Keep** |
| SDK-04 | `scripts/check-packed-artifact.runtime.ts`, `validate-downstream-consumer.runtime.ts`, `check-import-boundaries.ts`: command/path/stdout/stderr/message and manifest strings | Manifest-declared local validation commands | transport primitives + local diagnostics -> same | decoded package manifests; scoped temp workspaces | none | local `string`/Schema Types | local strings | command/result tagged classes and local Schemas | file/process output decoded at command boundary | terminal only; no persistence/provider/user response | Raw command evidence is intentional for the invoking repository operator | **Keep under explicit local non-persistent policy** |
| TEST-01 | `packages/testing/src/index.ts` `expectAt` thrown message | Exported test-helper diagnostic | diagnostic text -> diagnostic text | deterministic index only | none | `string` | N/A | thrown test assertion fallback | local typed input | test runner only | No runtime/package consumer data or secret path | **Keep; test-only local boundary** |
| TSCONFIG-01 | `packages/tsconfig/base.json` and package export map | Compiler JSON artifact | application string contract -> N/A | TypeScript compiler owns option strings | none | JSON | JSON | N/A | TypeScript | TypeScript | No application Schema/source contract exists | **N/A** |
| SCRIPT-01 | `packages/scripts/src/release-readiness/schemas.ts` `ReleaseCheckId` | Exported repository command vocabulary | closed vocabulary -> closed vocabulary | exact ordered check IDs | none | literal union | same | `ReleaseCheck` | trusted plan construction | report rendering | Exhaustive command policy | **Keep** |
| SCRIPT-02 | `ReleaseCheck.args`, `command`, `cwd`, `label`; `ReleaseCommandOutcome.stdout`, `stderr` | Exported command evidence and process boundary | transport primitive/content/diagnostic -> same | non-empty command/cwd/label; no content check for process streams | none | strings | strings | Schema-tagged classes | process adapter captures decoded text | returned report and local terminal formatter | Raw fields are useful evidence but unsafe for persistent or remote egress | **Keep under explicit local non-persistent policy** |
| SCRIPT-03 | `errors.ts` execution/path `message`, `url`; `formatReleaseReadinessError` rendered cwd/stdout/stderr | Local CLI diagnostic egress | diagnostic text -> diagnostic text | no sanitizer; exact command evidence intentionally rendered | none | `string` | N/A | tagged errors and `Match` formatter | process/path failures | `release-readiness.runtime.ts` writes only to invoking terminal | Output may contain workspace paths/secrets printed by child tools; policy forbids capture, persistence, provider or user-facing forwarding | **Keep under explicit local non-persistent policy; sentinel test required before any broader egress** |
| SCRIPT-04 | `renderReleaseReadinessReport` command/cwd rendering | Local CLI success diagnostic | diagnostic text -> diagnostic text | trusted plan plus outcomes | none | `string` | N/A | pure renderer | typed report | invoking terminal | Same local-only limitation as SCRIPT-03 | **Keep** |
| APP-API-01 | `apps/api/src/schemas.ts` source `host`, TCP `hostname`; config service | App config and server adapter | transport primitive -> transport primitive | non-empty string; port separately bounded | none | `string` | `string` | Config parse -> Schema decode -> service value | Effect Config/environment then one Schema decode | Bun server option | Hostname is not a secret; accepting DNS/IP/socket host forms is intentional | **Keep** |
| APP-API-02 | `apps/api/src/index.ts` listening log hostname | Operator diagnostic | diagnostic text -> diagnostic text | derived from validated non-secret config | none | `string` rendering | N/A | template rendering | typed config | process console only | No persistence/provider/user response | **Keep under local runtime-log policy** |
| APP-API-03 | `apps/api/scripts/smoke-public-routes.runtime.ts` route, command, cwd, stdout/stderr and error messages | Manifest-declared smoke command | transport primitives + local diagnostics -> same | canonical routes, scoped temp workspace and process results | none | local strings | local strings | local tagged errors/records | HTTP/process/file boundaries | invoking terminal only | Raw external-consumer evidence is local and non-persistent | **Keep under explicit local non-persistent policy** |

### Explicit surface N/A findings

- Persistence implementation: N/A. Core owns explicit `TraceNodeEncoded` and
  `LedgerComponentEncoded` transport/persistence-capable codecs, but no audited
  package or app persists them to a database, queue or file store.
- Provider integration: N/A. No in-scope owner wraps a third-party provider SDK
  or has a provider request/response string contract.
- Secrets: N/A. No in-scope config or exported Schema currently accepts a
  credential or secret, so neither `Schema.RedactedFromValue` nor
  `Schema.Redacted` is currently required.
- Browser/React: N/A. `apps/docs` and `apps/web` are outside this rollout; no
  React composition or browser-runtime surface is changed.

### Decision-ready correction entries

| Correction | Exact owning files | Focused owner commands | Compatibility and release artifacts | API app changelog |
| --- | --- | --- | --- | --- |
| CORR-001 / STR-DEC-001 | Core date Schema/constructor, new owner test/config/manifest/README, Knip test inventory and lockfile; exact paths are closed in RPC-006 `resolvedScope`. | Core test/type/build, all three AU rule packages, calculator, API HTTP and SDK/downstream command sets in `resolvedScope`. | Approved breaking accepted-input correction; major `@taxkit/core` Changeset. | No standalone entry because no HTTP request accepts `IsoDate`; run API/OpenAPI proof. |
| CORR-002 / STR-DEC-002 | Both report owners/tests/READMEs, calculator/API/SDK/app/downstream consumers, OpenAPI snapshot and calculator architecture doc; exact paths are closed in `resolvedScope`. | Both rule owners, calculator, API HTTP, SDK packed/downstream and API app commands in `resolvedScope`. | Approved independent exact ruleset versions; major entries for both rule packages and patch entries for transitively affected calculator/API/SDK packages. | Required for both response values and their independent-ruleset meaning. |
| CORR-003 | Calculator formatter/test/README, HTTP and Effect SDK tests, API architecture and app changelog. `schemas.ts` and OpenAPI shape are exact N/A. | Calculator, API HTTP, SDK and API app command sets in `resolvedScope`. | Reproduced leak; approved stable message correction preserving tags/paths/help. Patch calculator and API HTTP entries; SDK joins CORR-004. | Required for safe field-error text. |
| CORR-004 | Plain SDK error projection/test/README. Effect facade source and API app are exact N/A. | SDK type/test/build/boundary/packed/downstream commands in `resolvedScope`. | Approved removal of raw `Cause.pretty`; patch `@taxkit/sdk` entry. | N/A; HTTP does not use the plain formatter. |
| REL-DEC-001 | `.changeset/config.json` and `docs/standards/versioning.md`; validator inventory is already exact and is proof-only. | Changeset status, strict downstream and root verification. | Approved ninth fixed-group member; config/docs policy edit has no package Changeset and RPC-006 does not run `version-repo`. | N/A. |

CORR-002 was discovered by RPC-002 without presuming package semver. RPC-005
resolved it as the independent ruleset contract above after auditing exact
consumers and snapshots. The sibling task list is canonical for every exact
RPC-006 file, command, N/A, Changeset and app-changelog consequence.

### RPC-002 downstream impact ledger

| Surface | Decision | Path evidence |
| --- | --- | --- |
| Canonical architecture | Change required | `docs/architecture/effect-services.md` now owns the six-category taxonomy, Type/Encoded distinction and diagnostic egress policy. |
| Standards examples | Change required | `docs/standards/code-patterns.md` links to the canonical owner and keeps only concise selection/construction examples. |
| Active implementation evidence | Change required | This plan owns the manifest-to-field ledger, correction commands, blockers and three audit passes. |
| Product spec/task state | Change required | The spec and sibling task list must record CORR-002 as an audit-discovered compatibility decision before RPC-005. |
| Package READMEs | N/A for RPC-002 | No package contract changes in this audit. CORR-001, CORR-002 and CORR-004 name the exact conditional README owners for RPC-006. |
| Lint/rules/fixtures/CI | N/A for RPC-002 | No rule or workflow changes. RPC-003 owns lint; root verification already runs docs/static gates. |
| Skills, AGENTS and metadata | N/A for RPC-002 | Concurrent approved governance files are preserved. The taxonomy does not add a skill or instruction surface. |
| Config/manifests/schemas/generators/tests/ops | N/A for RPC-002 | No runtime artifact changes. Exact future files and commands are isolated in the correction table. |
| Frontend/browser/runtime | N/A for RPC-002 | Website apps are excluded; app/API runtime behavior is unchanged. |
| Migrations/providers/secrets/telemetry/deployment | N/A | No current persistence/provider/secret surface and no operational mutation. |

## Validation Log

### 2026-07-18 - Rollout setup

- Read the target spec, task list, canonical implementation protocol and the
  architecture guidance for Effect services, package ownership, configuration,
  testing and abstraction admission.
- Confirmed the starting branch is `main` and the spec, task list and product
  spec index are the only pre-existing uncommitted rollout files.
- Corrected RPC-001's baseline scope to name all 11 files represented by the
  independently reproduced 39-reference checkout-path baseline.
- Confirmed RPC-001 through RPC-004 can proceed sequentially without deciding
  `STR-DEC-001` or `REL-DEC-001`; the rollout stops before RPC-005 unless both
  decisions receive explicit approval.

### 2026-07-18 - RPC-001 implementation candidate

- Replaced the 39 baseline file/line findings across the named 11 tracked files
  with repository-relative commands, repository identities and concise
  historical descriptions. An independent tracked-and-untracked readable-text
  audit returned zero and explicitly included the checker and both test files.
- Added the root-owned `tools/repository-paths` contracts, pure policy, Bun
  runtime and focused tests. The runtime inventories NUL-delimited
  `git ls-files` output through `ChildProcessSpawner`, reads files and tracked
  symlink values through Effect FileSystem, applies strict UTF-8/NUL binary
  classification with bounded concurrency and emits stable schema-backed
  findings without matched text, usernames, stderr or surrounding content.
- Added `check:repository-paths`, `check:repository-paths:types` and
  `test:repository-paths`; root verification runs the first two and root test
  runs the focused suite. Knip owns the exact root entry/project inventory and
  Oxlint owns the exact decoder/runtime entrypoint allowlists.
- Focused evidence passed: `bun run test:repository-paths` (11 tests),
  `bun run check:repository-paths:types` and `bun run
  check:repository-paths` (507 text, 8 binary and 515 tracked files).
- Repository evidence passed: `bun run verification`, `git diff --check`, JSON
  parsing for every changed task list/config file and `bun run changeset status
  --verbose`.
- No Changeset is required: this slice changes a root-internal validation tool,
  repository configuration and documentation, not a versioned package-facing
  contract. `@taxkit/scripts` remains unchanged.

RPC-001 improvement audits:

1. Matching and fixture audit: kept HTTPS references, repository-relative
   paths, repository identities, ordinary prose and tilde-dot tool state valid;
   added all five rejected categories, deterministic precedence, CRLF line
   reporting, malformed UTF-8/NUL proof and runtime-assembled private-looking
   fixtures. The runtime reads tracked symlink values instead of following
   workstation targets.
2. Effect and ownership audit: retained one linear `Effect.gen` primary
   program, canonical Schema-derived findings and tagged errors, one
   `BunServices.layer` provision and one runtime `runMain`; removed unused
   helper/type exports found by Knip. No unsafe casts, DTO mirrors, manual
   object readers, broad services/layers or raw process error rendering remain.
3. Artifact audit: checked every baseline replacement for preserved meaning,
   added exact root/Knip/Oxlint wiring and aligned README, package ownership,
   testing and tooling guidance. No browser/runtime package gained a server-only
   import.

### 2026-07-18 - RPC-001 parent audit correction turn 1

- Parent review found that root `package.json` declared
  `@effect/platform-bun` and `@types/bun` while the root workspace manifest in
  `bun.lock` still omitted both entries. Re-ran the repository's normal `bun
  install` flow and confirmed the lockfile now records both root development
  dependencies. The same lock reconciliation aligned stale workspace version
  records from `0.1.0` to the already-current `1.0.0` package manifests; it did
  not edit package manifests or run `version-repo`.
- `bun install --frozen-lockfile` now passes, proving package and lockfile state
  agree.
- Re-ran `bun run test:repository-paths` (11 tests), `bun run
  check:repository-paths:types`, `bun run check:repository-paths`, `bun run
  verification`, `bun run changeset status --verbose`, JSON parsing and `git
  diff --check`; all passed and Changesets still reports no package release.
- Reconfirmed this correction changes only `bun.lock` plus this execution-plan
  evidence. Concurrent `.agents/skills/**` changes remain outside RPC-001 and
  untouched. The no-Changeset decision remains correct because the root tool,
  root dependency declarations, lockfile and documentation are not a versioned
  package-facing contract.

### 2026-07-18 - RPC-001 parent acceptance

- Parent review accepted the closed five-category policy, portable-path
  exceptions, Schema-derived findings, tagged failures, tracked-symlink
  handling, strict text/binary classification, bounded Effect platform flow
  and stable safe reporting. No unsafe cast, DTO mirror, repeated decoding,
  generic scanner abstraction, service/layer sprawl or browser import was
  introduced.
- The parent independently ran `bun install --frozen-lockfile`, the focused
  test/type/runtime commands, `bun run verification`, `bun run test`,
  Changeset status, JSON validation, `git diff --check` and a tracked-plus-new
  readable-text audit. All final commands passed; the expanded audit found zero
  checkout-path references and included the new tool, spec and plan files.
- One first root-test attempt completed the new path tests and API assertions
  but an API test worker then hit a transient allocator `SIGABRT`. The exact
  root test retry passed all 18 Turbo tasks. The same transient class affected
  one earlier Knip attempt; standalone and complete verification retries passed.
- The parent confirmed root `test` executes the focused path suite and root
  `verification` executes the tool typecheck and live zero-findings scan, so the
  existing CI workflow enforces both contracts without workflow changes.
- RPC-001 is accepted with the documented no-Changeset rationale. The final
  call graph remains the spec graph, and RPC-002 may now begin.

### 2026-07-18 - RPC-002 implementation candidate

- Audited the nine artifact manifests and exported owners, plus
  `@taxkit/scripts` and `apps/api`, through Schema, Type/Encoded, constructor,
  ingress, egress and compatibility. `@taxkit/tsconfig`, current persistence,
  provider and secret surfaces are explicit N/A findings.
- Reconciled every row with installed Effect `4.0.0-beta.98`: brands are
  nominal only, `RedactedFromValue` owns raw ingress and `Redacted` expects an
  already-redacted value. Recursive `TraceNodeEncoded` and schema-coupled
  generic interfaces remain justified; no helper/schema bucket, DTO mirror,
  unsafe cast or repeated internal decoder is proposed.
- Added the canonical six-category taxonomy and concise linked standards
  examples. No package/runtime/manifest/test/README/Changeset/changelog/skill
  or AGENTS file was changed by RPC-002.
- Preserved `STR-DEC-001` and `REL-DEC-001`. Added routed blocker
  `STR-DEC-002` because both public `rulePackVersion` fields emit `0.0.0` while
  their owner manifests are `1.0.0`. That mismatch is evidence only; the spec,
  task decision routing, RPC-005, RPC-006 and this plan require an explicit
  owner/meaning, exact-value-consumer and compatibility decision without
  presuming package semver or a value change.
- Exact correction files, owner commands, compatibility, Changeset and API app
  changelog impact are recorded for IsoDate, rule-pack versions, calculator
  Schema diagnostics, SDK `Cause.pretty` diagnostics and release policy.

Verification evidence:

- Passed: task JSON parsing, format, diff check, relative-link audit, ledger
  assertions, repository-path check (516 text, 8 binary, 524 tracked), full
  `bun run verification`, and `bun run changeset status --verbose` with no
  pending release.
- Manifest validation proved every named owner command exists. Current focused
  proof passed for calculators `test-types`, API HTTP `test:openapi` (1 test),
  SDK `check-boundaries`, scripts `test` (4 tests), and the full API app smoke
  including its external temp-workspace consumer. SDK packed/downstream was
  not rerun because this audit changes no package graph; it remains mandatory
  for an approved SDK/package-graph correction.
- Standalone SDK `test-types` currently reports eight pre-existing Effect
  language-service floating-Effect diagnostics in
  `type-tests/effect-client.test.ts`. RPC-002 cannot edit this code; RPC-006
  cannot accept an SDK correction until the command passes.

Improvement audits:

1. Taxonomy/sprawl: retained nominal brands only for real mixing risk, literals
   for closed rule contexts, and plain/inline strings for ordinary content.
2. Type/Encoded/data flow: separated branded Types, raw encodings, URL
   conversion, trusted construction, recursive codecs and local versus
   persistent/provider/user-facing diagnostic egress.
3. Coverage/artifacts: rechecked every manifest owner, explicit N/A and
   decision/correction row. Exact future artifacts are isolated; this slice is
   documentation-only and correctly has no Changeset.

Parent acceptance:

- Correction turn 1 removed the presumption that the `rulePackVersion`
  mismatch implies package semver or an additive-compatible value change.
  `STR-DEC-002` now blocks the exact keep/change/deprecation, command,
  Changeset and app-changelog scope.
- Parent review independently confirmed all 42 owner-ledger rows, the explicit
  N/A surfaces, installed package scripts and the three audit passes.
- Parent gates passed: task JSON parsing, decision-neutral negative scan,
  `git diff --check`, `bun run verification` (23 of 23 workspace typecheck
  tasks) and `bun run changeset status --verbose` with no pending release.
- RPC-002 is accepted with its documentation-only no-Changeset rationale. Its
  target call graph adds no runtime owner or edge, and RPC-003 may now begin.

### 2026-07-18 - RPC-002 parent audit correction turn 1

- Parent review accepted STR-DEC-002 as a valid routed finding but found that
  the two report rows and CORR-002 prematurely selected a value-change outcome
  before the field owner and meaning were resolved.
- Revised every STR-DEC-002 surface to be decision-neutral: the package-version
  mismatch is evidence only; package semver is not presumed; any encoded-value
  change is observable compatibility risk for exact-value consumers and
  snapshots; keep/change/deprecation, exact commands, Changesets and API app
  changelog impact remain blocked until RPC-005 closes the decision.
- Rechecked the spec blocker, task-level evidence and RPC-005 prompt, active
  decision log, both ledger rows, correction matrix, audit summary and RPC-006
  routing for the same presumption. No package/runtime artifact was edited.

### 2026-07-18 - RPC-003 implementation candidate

- Recorded the complete pre-edit matrix above. Admitted only
  `effect/no-bare-effect-try-promise`; rejected duplicate host/runtime/codec
  candidates, unreliable nullable/outcome candidates, every unproven
  calculator namespace move and website-specific route-loader policy.
- Implemented the admitted rule with the existing shared binding tracker. It
  resolves canonical root, namespace and `effect/Effect` imports, renamed
  bindings, static aliases/destructuring and reassignment, and requires one
  direct inline function-valued `try` property and one direct inline
  function-valued `catch` property with no dynamic spread. Reassignment to an
  unrelated local clears the tracked semantic.
- Enabled the rule with positive non-website scopes for packages, `apps/api`
  and repository tools. No `off` override, package exemption, ignore pattern
  or inline directive was added. The focused lint test received only the exact
  Bun host-adapter entry needed to execute the installed binary and create its
  temporary fixtures.
- Added focused installed-binary cases plus the aggregate accepted, rejected
  and unrelated-shadow fixtures. The admitted scope has zero source
  migrations. Five callback-form calls under `apps/docs` remain unchanged and
  outside this rollout.
- Updated Effect, testing and code-pattern guidance with the inline rejection
  mapping contract and the review-only reasons for nullable leakage and
  `Result`/`Exit` re-encoding. Existing Bun, TaxKit decoder, calculator and
  route-transport plugin ownership remains unchanged.

Verification evidence:

- `bun run test:oxlint` passed 35 tests and 77 assertions across the focused
  rule, aggregate real-binary fixtures and existing decoder/route suites. The
  focused rule proves six rejected canonical binding forms; seven rejected
  non-inline, missing, extracted, non-function and spread-policy calls; three
  accepted inline arrow/function/method styles; unrelated shadows; and
  semantic clearing after reassignment, always with
  `--disable-nested-config`.
- `bun run lint` passed after adding only the focused test file to the exact
  Bun host-adapter boundary list. `bun run verification` passed the repository
  path/type gates, Effect language service, lint, format, skill policy, Knip
  and all 23 workspace typecheck tasks.
- `bun run --filter @taxkit/sdk check-boundaries` passed. A changed-file import
  audit found no app, package runtime or website source migration, so existing
  browser-safe API/SDK imports and runtime ownership are unchanged.
- JSON parsing, `git diff --check`, added-line scans for ignore/off/disable
  policy and Changeset status passed. Changesets reports no package release.
  This is repository-internal lint tooling and documentation with no
  publishable package behavior change, so no Changeset is required.

RPC-003 improvement audits:

1. Candidate and false-positive audit: challenged every candidate against the
   current namespaces and source. Kept exact host, runtime, encoder, throwing
   codec, decoder, calculator and route owners; rejected raw tag/null matching
   because it cannot prove outcome or boundary provenance.
2. Visitor and flow audit: reused one binding tracker rather than adding a
   second analyzer, kept the rule to one visitor and one semantic set, proved
   aliases/destructuring/reassignment/shadows through the installed binary and
   introduced no helper, unsafe cast, DTO mirror, manual reader or source
   migration.
3. Full lint-graph audit: replaced broad positive globs with an explicit
   app/package/tool owner list and removed the proposed decoder exemption from
   the focused test by rendering process bytes through the host adapter
   instead. The final graph has only the necessary Bun test boundary, no
   suppressions, unchanged Bun/TaxKit namespace exports, unchanged
   decoder/route strictness, aligned architecture docs and an internal-tooling
   no-Changeset decision.

Parent acceptance:

- Correction turn 1 closed the key-presence loophole: the rule now requires
  direct inline function-valued `try` and `catch` properties and rejects
  callback, missing, duplicate, extracted, non-function, shorthand and spread
  policy while preserving unrelated-shadow and reassignment semantics.
- Parent review confirmed the decision matrix, explicit owner list, unchanged
  decoder/route ownership, one necessary Bun test boundary and zero source
  migrations.
- Parent gates passed: 35 of 35 Oxlint tests (77 assertions), SDK import
  boundaries, `git diff --check`, Changeset status with no pending release and
  a serial `bun run verification` with 23 of 23 workspace typecheck tasks.
  One earlier parallel parent run observed an intentionally invalid generated
  fixture before test cleanup; the clean serial gate passed.
- RPC-003 is accepted with its repository-internal no-Changeset rationale.
  Its final call graph matches the target and RPC-004 may now begin.

### 2026-07-18 - RPC-003 parent audit correction turn 1

- Parent review found that key-presence alone accepted extracted or invalid
  `catch` policy such as `catch: sharedMapper` and `catch: undefined`, contrary
  to the matrix and callsite-owned error-mapping contract.
- Tightened the admitted visitor to require exactly one direct `try` and one
  direct `catch` property whose values are inline arrow/function expressions
  or object methods. Missing, callback, extracted, non-function, duplicate and
  spread-overridable policy now reports; unrelated shadowed locals remain
  accepted.
- Expanded the focused installed-binary fixture to seven rejected policy forms
  and three accepted inline property styles while preserving the six canonical
  binding rejections, alias clearing and `--disable-nested-config` execution.
- Challenged and removed the proposed decoder-boundary exemption for the
  focused test. Process bytes now render through its owning host adapter, so
  only the exact Bun host-adapter entry remains and the repository-wide TaxKit
  decoder rule is not weakened.
- Reconciled the matrix, Effect architecture, testing guidance, code patterns
  and verification counts with the final visitor. `bun run test:oxlint`, `bun
  run lint`, `bun run verification`, Changeset status and `git diff --check`
  all passed; Changesets still reports no package release.

## RPC-004 Production Reachability Inventory

The pre-edit audit used each package manifest's `exports.source` paths, or the
declared distribution path when the SDK has no workspace-only source
condition, and then checked the real source counterpart before adding a Knip
pattern. The inventory is configuration evidence, not a second manifest.

| Owner | Manifest or command surface | Production source counterparts |
| --- | --- | --- |
| `@taxkit/core` | `.`, `primitives`, `facts`, `parameters`, `errors`, `engine`, `rules`, `graph`, `trace`, `ledger` | `src/index.ts` and the nine matching `src/*/index.ts` files |
| `@taxkit/rules-au-income-tax` | `.`, `facts`, `parameters`, `rules`, `rule-pack`, `calculator` | `src/index.ts` and the five matching owner `index.ts` files |
| `@taxkit/rules-au-pay` | `.`, `facts`, `parameters`, `rules`, `calculator`, `rule-pack` | `src/index.ts` and the five matching owner `index.ts` files |
| `@taxkit/rules-au-stsl` | `.`, `facts`, `parameters`, `rules`, `rule-pack` | `src/index.ts` and the four matching owner `index.ts` files |
| `@taxkit/calculators` | `.`, `catalog`, `errors`, `metadata`, `service`, `live`, `schemas` | `src/index.ts`, `catalog.ts`, `errors.ts`, `metadata.ts`, `service.ts`, `live.layer.ts`, `schemas.ts` |
| `@taxkit/api-http` | `.`, `api`, `client`, `client/live`, `client/server`, `config`, `server`, `handlers`, `handlers/live` | The nine exact manifest-owned files under `src` |
| `@taxkit/sdk` | `.`, `effect`, `au`, `au/effect`, `schemas`, `testing` | `src/index.ts`, `effect.ts`, `au.ts`, `au-effect.ts`, `schemas/index.ts`, `testing/index.ts` |
| `@taxkit/testing` | `.` | `src/index.ts` |
| `@taxkit/scripts` | public `.`, manifest `release:check` command | `src/index.ts`, `src/release-readiness/release-readiness.runtime.ts` |
| standalone `api` | manifest `start` runtime | `apps/api/src/index.ts` with runtime traversal through `src/config.ts` and `src/server.ts` |
| `@taxkit/tsconfig` | `base.json`, `package.json` | **N/A**: JSON-only artifact; strict downstream tarball validation remains its proof |

Pre-edit controls and exclusions:

- Positive control: production tracing must retain the runtime edge from
  `apps/api/src/server.ts` to `@taxkit/api-http`.
- Negative control: a pay-only production trace must not contain
  `@effect/vitest` or `packages/rules/au/pay/test/**`; both are development-only.
- Pattern control: every positive entry and project glob must carry Knip
  6.14.2's trailing `!`, and tests, fixtures, examples, generated output,
  Vitest config and root tools must not appear as positive patterns.
- Exact excluded workspaces are root development tooling, the docs/web apps,
  docs-content/docs-fumadocs website support and JSON-only tsconfig. There is
  no root production workspace and no website production owner.

### 2026-07-18 - RPC-004 implementation candidate

- Added `knip.production.json` with 64 exact production entry/project patterns
  across the ten TypeScript owners above. Root `knip:production` invokes the
  installed Knip 6.14.2 binary with `--production --config
  knip.production.json --no-progress --no-config-hints`, and root verification
  runs it after the unchanged development-aware graph.
- The first isolated production pass found five production-unnecessary API
  exports and one scripts test-layer file. Returned OpenAPI normalization and
  formatting to `__tests__/openapi-snapshot.test.ts`, made the health endpoint,
  health response and in-process fetch layer private to their runtime owners,
  and excluded only `packages/scripts/src/release-readiness/test.layer.ts`
  through one exact production negation. No public manifest export or runtime
  behavior changed.
- Retained one exact `ignoreIssues` entry:
  `packages/api/http/src/client/service.ts` has a duplicate-export finding
  because the package deliberately exposes the same Context service as
  `TaxKitHttpApiService` and `getTaxKitHttpApiClient`. Removing an existing
  public compatibility name is not justified by a reachability tool; no other
  issue exception exists.
- Positive trace output is `apps/api/src/server.ts:1:10
  @taxkit/api-http`. Pay-only production traces for both `@effect/vitest` and
  `packages/rules/au/pay/test/take-home-pay.test.ts` are empty. A structural
  audit counted all 64 patterns, found zero forbidden positive patterns and
  confirmed the single exact issue exception.
- Focused verification passed: both Knip graphs; API HTTP `check-types`,
  `test:openapi`, full test (5 tests) and build; standalone API `check-types`
  and build. No app/package/browser import was changed, and the production
  graph traverses existing browser-safe manifest entrypoints rather than deep
  server internals.

RPC-004 impact ledger:

| Surface | Decision | Path evidence |
| --- | --- | --- |
| Spec, task list and active plan | Change required | The spec/task impact rows and this plan record the proven API cleanup, inventory, controls, exact exception and verification. The product-spec index is N/A because routing/status did not change. |
| Canonical architecture and standards | Change required | `docs/architecture/testing-and-quality.md` and `docs/standards/tooling.md` distinguish development-aware source hygiene, production reachability and strict packed/downstream proof. |
| Root and package READMEs | Root change; package N/A | Root `README.md` exposes the command. No package-facing contract changed, so package READMEs remain current. |
| Knip, lint, fixtures and CI | Change required / N/A | `knip.production.json` and root scripts own the new graph. `knip.json`, Oxlint, lint fixtures and `.github/workflows/quality.yml` are unchanged; CI inherits the new root verification command. |
| Skills, AGENTS and metadata | N/A | Concurrent approved governance work is preserved. Production reachability adds no skill or instruction policy. |
| Config, manifests, exports, tests and operations | Change required | Root `package.json`, the three API source owners and their two focused tests changed. Package manifests, declared public entrypoints, generated output and commands are unchanged. |
| API/SDK/provider/storage/observability/deployment | Internal API cleanup only | The API call graph and outputs are unchanged; there is no provider, storage, telemetry, deployment or rollback mutation. Packed/downstream SDK gates remain separate and were not replaced. |
| React, website, accessibility and browser proof | N/A | `apps/docs` and `apps/web` are exact excluded owners and no React/browser file changed. |

RPC-004 improvement audits:

1. Manifest and reachability audit: mapped every public source counterpart,
   scripts command and API runtime before configuration; removed test-only
   reachability and proved positive/negative runtime controls.
2. Ownership and finding audit: fixed internal exports at their owners, moved
   snapshot-only logic to its test, kept one exact public compatibility alias
   exception, and introduced no manifest mirror, broad ignore, helper, unsafe
   cast, DTO or Effect control-flow change.
3. Graph and artifact audit: ran both independent Knip graphs and focused
   API/app gates, checked all positive patterns and browser-safe imports, and
   kept strict SDK tarball/downstream proof separate.

Final verification evidence:

- `bun run verification` passed with both Knip graphs and 23 of 23 workspace
  typecheck tasks. The first attempt found one type-only OpenAPI test import;
  correcting it to `import type` made the clean rerun pass.
- `bun run test` passed the 11 repository-path, six docs-boundary and 35 Oxlint
  tests plus all 18 Turbo tasks. The focused API HTTP suite passed five tests.
- `bun run build` passed all 14 Turbo tasks. Existing upstream Rolldown pure
  annotation and bundle-size warnings did not fail either website build and are
  outside RPC-004.
- `bun run changeset status --verbose` initially detected the internal API
  package cleanup without a Changeset and explicitly required `changeset add
  --empty` for a no-release change. `.changeset/bold-stars-grab.md` records that
  decision; the final status passes and reports no patch, minor or major package
  releases. No package version, changelog or publish state changed.
- JSON parsing, formatting, `git diff --check`, import-path inspection and the
  64-pattern structural audit passed. Existing browser/runtime consumers still
  import the API and SDK only through declared package entrypoints.

### 2026-07-18 - RPC-004 parent audit correction turn 1

- Parent review found that root `README.md` called the production Knip scope a
  "published package" graph. Replaced that implication with
  "release-artifact package" reachability: this repository currently owns
  local versioning, Changesets and artifact proof, not npm publication.
- Audited all RPC-004-added root, architecture, standards, spec, task, plan,
  configuration and Changeset wording. No other text claims that publication
  is configured: publication proof remains explicit N/A, packed/downstream
  validation remains artifact evidence only, and the no-publish/no-versioning
  policy remains unchanged.
- No implementation, package manifest, runtime behavior, release version,
  Changeset selection or RPC-005 scope changed. Focused formatting, diff,
  repository-path, both Knip and root verification gates plus final no-release
  Changeset status all passed for the wording correction; root verification
  completed all 23 workspace typecheck tasks.

Parent acceptance:

- Parent review independently confirmed all manifest-owned source entries, 64
  marked patterns, the exact scripts test-layer negation and the single API
  compatibility-alias exception.
- The positive API trace reached `@taxkit/api-http`; the pay-only
  `@effect/vitest` and test-file traces were empty. Both Knip graphs passed.
- Parent serial gates passed: `bun run verification` (23 of 23 typecheck
  tasks), `bun run test` (18 of 18 Turbo tasks plus focused suites), `bun run
  build` (14 of 14 Turbo tasks), `git diff --check` and no-release Changeset
  status. Existing website build warnings remain non-failing and out of scope.
- Correction turn 1 removed the only wording that implied npm publication.
  RPC-004 is accepted with its empty no-release Changeset, unchanged public
  manifest/runtime contracts and final target call graph. At that acceptance
  point RPC-005 still awaited the three decisions; they were resolved explicitly
  on 2026-07-19 below.

### 2026-07-19 - RPC-005 implementation candidate

- Recorded the user's exact “Approve all” instruction as explicit approval of
  1A/STR-DEC-001, 2A/STR-DEC-002, 3A/REL-DEC-001 and the full-SPEC CORR-003 and
  CORR-004 corrections. No approval is inferred from repository state.
- Re-audited installed Effect, the core date owner, both report owners, all nine
  `1.0.0` artifact manifests, Changesets config, versioning standard, strict
  downstream closure, exact report-value consumers and OpenAPI snapshot.
  `Schema.brand` accepted arbitrary text; the constructor also accepted
  normalized `2026-02-29`. Only the two owner literals pin `0.0.0` today.
- Reproduced a calculator formatter message containing both a secret sentinel
  and a private path, and confirmed the plain SDK writes raw `Cause.pretty`
  text to exported safe-result/rejected-Promise errors.
- Populated RPC-006 `resolvedScope` in the sibling task list with exact owner,
  test, doc, config, generated snapshot, command, compatibility, package/bump
  Changeset, app changelog and N/A records. It includes all four corrections,
  the fixed-group edit and repository-wide closure; it explicitly excludes
  package publication, tags and `version-repo`.

RPC-005 impact ledger:

| Surface | Decision | Evidence |
| --- | --- | --- |
| SPEC/task/index/plan | Change required / N/A | SPEC, task and this plan changed. Product-spec index stays N/A until final rollout status changes. |
| Canonical docs/standards/references/audit | N/A now; exact RPC-006 owners | Existing Effect guidance already owns the taxonomy; calculator/API/versioning docs are named for RPC-006. Reference and documentation-audit trees own no changed contract. |
| READMEs | N/A now; exact RPC-006 owners | Core, both rule, calculator and SDK READMEs are named. Root/app/skill READMEs have no command or ownership change. |
| Lint/fixtures/tests/scripts/CI | N/A now; exact RPC-006 owners | No executable changed. RPC-006 names focused tests, core Knip test wiring and existing root gates; custom lint and CI remain unchanged. |
| Skills/AGENTS/symlinks/metadata | N/A | No instruction contract changes; concurrent governance edits are preserved. |
| Config/manifests/exports/Schemas/generators/tests/examples/migrations/Changesets | N/A now; exact RPC-006 owners | RPC-006 names core test setup, owner Schemas, fixed-group config, generated OpenAPI snapshot and exact package/bump Changesets. Exports/examples/migrations stay N/A. |
| API/SDK/HTTP/storage/file/command/observability/deployment/operators | N/A now; exact RPC-006 owners | Calculator, HTTP, SDK, API smoke/changelog and packed consumer are named. Other runtime/ops surfaces have no edge. |
| React/accessibility/browser | N/A | Website and React surfaces remain excluded. |

Improvement audits:

1. **Contradiction/current-source audit.** Rechecked every decision against live
   source rather than historical prose. This strengthened CORR-001 to reject
   real impossible dates and turned CORR-003 from conditional proof into a
   required sanitizer after the sentinel reproduction.
2. **Compatibility/release audit.** Distinguished ruleset identity from package
   semver, classified the two public literal/output changes and core narrowing
   as major, classified diagnostic hardening as patch, and recorded the fixed
   group's highest-bump effect without applying versions.
3. **Closure/sprawl audit.** Removed all decision placeholders, kept the exact
   scope canonical in the task JSON, required owner-local Schemas and tests,
   rejected runtime manifest reads/generic version or sanitizer packages, and
   marked every unrelated doc, lint, skill, ops and React surface N/A.

No Changeset is required for RPC-005: it changes only decision and planning
documentation. Package/config/runtime changes and their exact Changesets are
reserved for RPC-006. No package version, tag, publication or release command
was run.

Verification evidence:

- Task JSON parsing, resolved-scope/non-stale-decision scans and
  `bun run format:check` passed.
- `bun run verification` passed the repository-path gate (519 text, 8 binary,
  527 tracked files), Effect language-service check, lint, formatting, four
  skill-policy tests, both Knip graphs and all 23 workspace typecheck tasks.
- `bun run changeset status --verbose` reported no patch, minor or major
  package release, confirming this decision-only slice adds no Changeset.
- The separately required RPC-006 SDK `test-types` preflight still reports the
  eight already-recorded floating-Effect diagnostics in
  `type-tests/effect-client.test.ts`. Its exact test-only repair is now a
  seventh `resolvedScope` row; suppressions or language-service weakening are
  prohibited. This is an RPC-006 implementation risk, not an unresolved product
  decision.

Parent acceptance:

- Independently reproduced brand-only `IsoDate` decoding of arbitrary text,
  `Date.parse` normalization of `2026-02-29`, and Standard Schema diagnostic
  leakage of a secret/private-path sentinel.
- Independently reviewed the exact-value search, nine-artifact manifest and
  validator evidence, fixed-group contradiction, all seven resolved-scope
  records, package bump classifications and path-evidenced impact ledger.
- Independently reproduced the eight SDK type-test diagnostics and accepted
  the no-suppression test-only repair as a necessary RPC-006 preflight.
- Parent gates passed: task JSON parsing, `bun run format:check`,
  `bun run verification` with all 23 workspace typecheck tasks,
  no-release `bun run changeset status --verbose`, and `git diff --check`.
  RPC-005 is accepted with no correction turn and no Changeset.

## Call-Graph Status

The target call graphs in the spec are the acceptance baseline. RPC-001 still
matches its target graph: tracked source and documentation flow through the
root repository-path command into a tracked-text inventory, schema-backed safe
findings and the zero-findings verification gate. The implementation adds only
the required tracked-symlink representation read inside that inventory step;
it does not introduce another owner or execution layer. Later tasks record
their graph result before parent acceptance.

RPC-002 matches the target Effect-contract graph: representation/config/process
values meet owner-named ingress Schemas, canonical Types flow inward and
encoding is reserved for explicit egress. It adds no runtime owner or edge.
RPC-005 has since resolved its constructor-only `IsoDate`, report-version and
public-diagnostic findings into the exact RPC-006 scope while preserving the
local non-persistent command-evidence decisions.

RPC-003 matches the target lint-test graph. One canonical `Effect.tryPromise`
call flows through the existing binding tracker, the admitted portable visitor,
the positive non-website scope and the installed Oxlint binary. Accepted,
rejected and unrelated-shadow fixtures prove that edge. No application runtime,
package contract, website path, plugin namespace or call-graph owner changed.

RPC-004 matches the target production graph. Manifest-owned source entrypoints,
the scripts runtime and standalone API entry flow directly into one dedicated
Knip production graph; the API traversal retains `@taxkit/api-http`, while pay
tests and `@effect/vitest` do not enter the graph. Root verification invokes
the unchanged development-aware graph and then the production graph. The only
additional internal movement returns OpenAPI snapshot normalization from a
runtime module to its owning test; public API, SDK and browser-safe import
edges are unchanged.

RPC-005 adds no runtime call-graph node or edge. It closes the approved target
graph for RPC-006: raw date representations enter one core checked-content
Schema/constructor invariant; owner-defined exact ruleset literals flow through
the existing calculator -> SDK/HTTP -> app/consumer egress; calculator Schema
issues lose rejected actual values at their existing owning projection; and the
plain SDK replaces `Cause.pretty` only at its existing error egress. Release
closure remains the existing nine artifacts, with calculators joining the
fixed-group configuration rather than adding a package or validator edge.

## Changeset Policy

Repository-internal tools and documentation normally record an explicit
no-Changeset rationale. RPC-004 also changes internal files under the versioned
API package, so Changesets' status gate required an empty no-release record;
that record names no package and causes no version bump. Every package-facing
correction receives a package-owned release Changeset, including changes to
private versioned packages. This rollout does not apply pending versions or
publish packages.

### 2026-07-19 - RPC-006 implementation candidate

Preflight and scope:

- Re-read all seven closed `resolvedScope` records after accepted commit
  `5217d21`. All approved decisions, owners, commands, compatibility treatment,
  Changeset entries and app-changelog outcomes were concrete; no placeholder or
  inferred correction remained.
- Implemented only CORR-001 through CORR-004, REL-DEC-001, the SDK type-test
  repair and repository closure. Concurrent governance changes under
  `.agents/**`, root instructions/docs/scripts and `tools/skills/**` remain
  outside this slice and were neither reverted nor absorbed.
- Added `.changeset/bright-dates-report.md` with major entries for
  `@taxkit/core`, `@taxkit/rules-au-income-tax` and `@taxkit/rules-au-pay`, plus
  patch entries for `@taxkit/calculators`, `@taxkit/api-http` and `@taxkit/sdk`.
  No version, tag, package changelog, publication or release command ran.

Implemented contracts and artifacts:

- CORR-001: `packages/core/src/primitives/date.ts` now owns one anchored-shape
  and real Gregorian-calendar predicate. Both the exported `IsoDate` Schema and
  `isoDate` constructor use it without `Date.parse` normalization. The brand
  Type and string Encoded form remain. `packages/core/test/date.test.ts` proves
  valid dates, leap/century rules, malformed/impossible dates, encoded output,
  `DateInterval` and `SourceArtifact`; package/Vitest/Knip/lock wiring makes the
  owner test part of normal repository proof.
- CORR-002: the income-tax and pay report owners each define an exact local
  literal Schema and emit `rules-au-income-tax/1.0.0` or
  `rules-au-pay/1.0.0`. Assertions cover both rule owners, calculator
  composition, HTTP, plain/Effect/AU SDK, external API smoke and the packed
  downstream consumer. OpenAPI now exposes both exact enums. No manifest read,
  version package, factory, DTO mirror or unsafe cast was added.
- CORR-003: `packages/calculators/src/errors.ts` keeps the existing sole
  Schema-issue projection, tags, normalized paths and descriptor help, while
  replacing rejected-value formatter output with `Invalid calculator input
  value`. Direct calculator, Effect SDK and HTTP tests inject secret and
  private-path sentinels and prove neither reaches public egress.
- CORR-004: `packages/sdk/typescript/src/errors.ts` no longer calls
  `Cause.pretty`. Stable outer, Schema and unexpected messages are selected at
  the existing plain-facade egress; typed `CalculatorServiceError` detail is
  retained. Safe-result and rejected-Promise fixtures, plus direct Schema and
  defect fixtures, prove sentinel absence.
- REL-DEC-001: `.changeset/config.json` and
  `docs/standards/versioning.md` now agree on the sole nine-package fixed group,
  including `@taxkit/calculators`; all package versions remain untouched.
- SDK test-types: all eight Effect-producing compile fixtures are assigned to
  named values. Assertions and the Effect language service remain enabled with
  no suppression or weakened command.
- Canonical owner READMEs, calculator/API architecture, versioning guidance,
  `apps/api/CHANGELOG.md`, the generated OpenAPI snapshot, this plan, the SPEC
  and task ledger now describe the implemented contracts. The SPEC's RPC-006
  impact ledger records every required surface and path-evidenced N/A.

Final call graphs:

```txt
unknown date string
  -> core isRealIsoDate predicate
    -> IsoDate Schema check -> existing taxkit/IsoDate brand -> string egress
    -> isoDate constructor check -> existing taxkit/IsoDate brand
      -> DateInterval / SourceArtifact and existing downstream consumers

rule owner exact literal Schema/value
  -> AnnualTaxReport | TakeHomePayReport
    -> PublicCalculatorService
      -> HTTP and Effect/plain/AU SDK
        -> apps/api external smoke and packed strict downstream consumer

selected calculator Schema failure
  -> existing toCalculatorInputDecodeError projection
    -> stable safe issue message + normalized path + optional descriptor help
      -> direct calculator | Effect SDK | HTTP egress

plain SDK typed failure | Schema failure | defect
  -> existing toTaxKitCalculationError projection
    -> stable outer/detail message + retained typed CalculatorServiceError
      -> TaxKitFailure or rejected Promise
```

Improvement audits:

1. **Approved-scope and abstraction audit.** Compared every edit with the seven
   resolved rows. Kept date and version policy in existing owners, used the
   existing calculator/SDK egress projections, removed the one-use date
   assertion helper, and rejected generic date/version/sanitizer modules. No
   unrelated cleanup, website work or governance edit entered the slice.
2. **Boundary and compatibility audit.** Replaced nullable RegExp match parsing
   with anchored `test` plus fixed slices; one predicate now enforces runtime
   Schema and constructor behavior. Existing canonical Type/Encoded/report/error
   shapes and ingress/egress placement remain. Exact literal output is proven at
   every named consumer; sentinels are proven absent at each corrected egress.
3. **Release and closure audit.** Confirmed the Changeset names exactly six
   affected packages and the fixed group has one nine-package row. Regenerated
   only the two OpenAPI enum additions, updated all named owner docs/changelog,
   repaired the real SDK type-test gate and preserved explicit N/A for lint,
   skills, ops, persistence, React and browser surfaces.

Focused verification completed before repository closure:

- `bun run --filter=@taxkit/core check-types`, `test` (13 tests) and `build`
  passed.
- Both affected rule packages passed `check-types`, `test` (13 income-tax and
  17 pay tests) and `build`; the unchanged STSL package passed `check-types`,
  `test` (12 tests) and `build`; calculators passed `check-types`, `test-types`,
  `test` (5 tests) and `build`.
- API HTTP passed `check-types`, `test` (5 tests), `test:openapi` and `build`;
  SDK passed `check-types`, `test-types`, `test` (14 tests), `build`,
  `check-boundaries` and `check-packed-artifact` (38 packed files).
- The strict downstream consumer packed, installed, typechecked and executed
  all nine packages, including exact plain/Effect pay and income-tax ruleset
  versions; export and browser-bundle checks also passed with no diagnostics.
  The API app passed `check-types`, `build` and its internal/external public
  route smoke, including both calculation routes.
- Both development and production Knip graphs, RPC-owned formatting, lint,
  frozen-lockfile proof, `git diff --check` and all stale/sentinel/unsafe-cast
  scans passed. The fixed group has exactly one row and nine packages; all
  seven resolved-scope records remain present.
- Repository `bun run test` passed all 19 Turbo tasks and `bun run build` passed
  all 14 Turbo tasks. The build retained only pre-existing third-party
  Rolldown annotation and chunk-size warnings.
- `bun run changeset status --verbose` passed. Because all nine packages are in
  one fixed group, the six package entries in the Changeset correctly resolve
  to a coordinated 2.0.0 major release for all nine packages; no versioning or
  publication command ran.
- Root `bun run verification` initially reached `format:check` while four
  concurrent, out-of-scope governance files were still being edited. Their
  owner formatted those files without RPC-006 absorbing them; the parent then
  reran the complete root verification successfully.

### 2026-07-19 - RPC-006 parent acceptance

The parent accepted RPC-006 without a correction turn after independently
reviewing every changed contract and rerunning the focused and repository-wide
proof. The accepted slice contains only the seven closed `resolvedScope`
records plus final SPEC/task/index/completed-plan bookkeeping; concurrent
governance changes remain preserved and excluded.

Independent acceptance evidence:

- Core, calculator, API HTTP and SDK focused tests passed, including the core
  real-calendar suite, exact ruleset values and diagnostic sentinel coverage.
- The SDK packed-artifact and strict downstream consumer validated all nine
  tarballs, both plain and Effect result paths, exact ruleset versions, runtime
  exports and the browser bundle. API internal/external smoke passed for both
  calculation routes and OpenAPI.
- `bun install --frozen-lockfile`, `bun run verification`, `bun run test`,
  `bun run build`, `bun run changeset status --verbose` and
  `git diff --check` passed. The only build output was existing non-failing
  third-party annotation and chunk-size warnings.
- Structural scans found no stale `rules-au-*/0.0.0`, no SDK `Cause.pretty`,
  no added unsafe casts or suppressions, one exact nine-package fixed group,
  seven resolved-scope records and unchanged `1.0.0` package manifests.
- `.changeset/bright-dates-report.md` records the approved six package-facing
  entries. The fixed group therefore reports a future coordinated `2.0.0`
  release for all nine packages, but this rollout did not run `version-repo`,
  publish, tag or create a release pull request.
- References, documentation-audit/status snapshots, root commands, custom
  lint, CI, website, browser, deployment and operator surfaces remain N/A for
  this final correction because their ownership or behavior did not change.
