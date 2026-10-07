---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-07
review_trigger: package, app, root composition, or semantic ownership change
---

# Package ownership

Package ownership defines where new TaxKit code should belong as the repo
grows and which package will be allowed to define canonical contracts. It does
not imply that every named package exists today.

## Scope

This doc routes ownership decisions. [Package boundaries](./package-boundaries.md)
contains the proposed package map and dependency direction.

Current implemented code lives in:

- `apps/api`
- `apps/web`
- `packages/core`
- `packages/calculators`
- `packages/content`
- `packages/analytics`
- `packages/docs-content`
- `packages/docs-examples`
- `packages/docs-fumadocs`
- `packages/api/http`
- `packages/api/rpc`
: Private compiled native Effect RPC transport. It owns separately versioned
  calculator and documentation procedures, thin named service handlers, checked POST/JSON ingress and
  caller-scoped private client Layers. Calculator/content Schemas remain with
  their existing owners. Explicit test-only composition is separate; no app
  runtime or backend fallback belongs here. T003 app-host composition is locally accepted; T009 exported tracing remains open.

`packages/sdk/typescript`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/scripts`
- `packages/testing`
- `packages/tsconfig`

Current planned ownership placeholder:

- `packages/ui`

The placeholder directories contain README guidance only. Do not route runtime
imports, source ownership or build expectations to them until package manifests
and source exports exist.

## Main areas

`packages/core`
: Implemented shared primitives, fact descriptors, rule descriptors, graph
metadata, trace and ledger contracts, common tagged errors and calculation
engine service. Public trace inputs and results are JSON values, and
`SourceExtract.rowContract` names the extracted row contract without using the
vague former `shape` field.

`packages/domain/au/*`
: Planned Australian date dimensions and domain facts that are not owned by a
single rule pack.

`packages/rules/au/*`
: Official Australian rule packs, parameter tables, algorithms, source
references, graph metadata, rule-owned calculator ids/context literals and
golden tests. Current implemented packages are `pay`, `income-tax` and `stsl`.

`packages/testing`
: Shared test helpers for workspace packages. It must not become a back door
for production-only runtime helpers.

`packages/scripts`
: Implemented private repository-automation package. It owns schema-backed,
  Effect-native orchestration that crosses package owners, including the
  release-readiness command, its command-runner service, live process layer,
  deterministic test layer and runtime entrypoint. It invokes canonical root
  and package commands without moving or duplicating their validator logic.
  Constructor functions use `create*`; deprecated `make*` aliases remain only
  for package compatibility.

`tools/repository-paths`
: Root-owned repository portability gate. It owns the closed machine-local path
  policy, schema-backed safe findings, typed local process and file failures,
  focused tests and Bun runtime entrypoint. It is not a reusable file-scanner
  package. `@taxkit/scripts` may invoke its root command but must not mirror the
  policy.

`packages/api/http`
: Implemented HTTP API package. It owns Effect HTTP API definitions, boundary
schemas, thin server handlers, OpenAPI, typed HTTP clients and HTTP
status/transport annotations. Its narrow `request-boundary` export also owns the
shared streamed HTTP-body admission used by the RPC and native app hosts. The
RPC package depends inward on that export and retains its compatibility alias;
the HTTP package has no RPC runtime dependency. Client and Layer constructors use `create*`;
deprecated `make*` aliases remain at the export owner for compatibility.

`packages/calculators`
: Implemented reusable calculator orchestration package. It owns calculator
catalog composition schemas, calculator service methods, metadata projections,
graph response construction, schema-guided error shaping and
rule-pack/scenario composition used by HTTP, SDK, CLI and in-process callers.
It also owns the canonical reusable calculator run schemas named
`CalculatorRun*` and the `CalculatorServiceError` union. HTTP-only public
envelopes and status annotations stay in `packages/api/http`; SDK schema
exports may re-export calculator-owned run contracts but must not duplicate
them. Service interfaces use the precise `Contract` suffix rather than the
vague `Shape` suffix. It depends on `packages/core` and rule packages, but it
must not depend on HTTP handlers, SDK clients, CLI commands or app runtime
modules.

`packages/sdk/typescript`
: Implemented private TypeScript SDK package for a future public SDK
publication. It owns browser-safe schemas, typed calculation facades,
Effect-native subpaths, jurisdiction modules, examples, compatibility tests and
packed-artifact checks. Its strict downstream validator may orchestrate the
nine-package release closure and materialize package-declared publication
exports in temporary tarballs, but package manifests and exports remain owned
by their packages. It must not depend on `@taxkit/api-http`; HTTP
transports call the calculator service directly; the SDK is a test-only
comparison dependency of the HTTP package. Its Effect entrypoint owns
request-preserving calculator helpers such as `calculateRunRequest`,
`calculateReportRequest` and `calculateReport`, while reusing
calculator-owned `CalculatorRun*` schemas and `CalculatorServiceError`.

`apps/web`
: Native TanStack Website candidate. It owns form presentation/commands, the
  server runner and React Atom registry. The private server binding and checked
  public browser address reach the separate API through native RPC. The root
  restores encoded outcomes. Tax rules and calculations remain package/API-owned;
  the three calculator pages and bounded T003 connection are locally qualified.
  The same app owns checked documentation page loaders, app-specific MDX
  composition, navigation/focus, search and responsive reading. Its server
  returns checked backend discovery documents at their conventional addresses.
  Both Markdown representations and generated share images are locally
  qualified. Current release documentation checking selects this app.
  The old `apps/docs` workspace and writer workflows are retired; its
  verified original source and dated recovery records remain addressable.

`apps/docs`
: Retirement tombstone only. The strict historical source bundle retains all
  49 original files. The deployment runbook owns inspection and separately
  approved recovery, rather than an active old workspace.

Root `alchemy.run.ts`
: Static retirement record which the actual Alchemy importer refuses before
  session providers, remote state and planning. It declares no empty graph.

`packages/infrastructure`
: Private source-only owner of the native API/Website graph and stage/secret
  selection. The old `./stack` export is now the typed retirement marker.
  Pure retained old stage/resource metadata remains for historical receipt
  decoding. New provider operations belong DEV-81 and cannot inherit old IDs
  or approvals.

`tools/docs-deployment`
: Read-only historical receipt, source and policy checks. Retired writer CLI
  and workflow paths stop before configuration or credential fetch. Native
  process tests qualify the stops separately from historical source inspection.

`apps/api`
: API application owner. It retains standalone Bun config/startup/shutdown
and adds the native Alchemy Worker candidate for active DEV-74. The native
instance owns one router and calculator service; incoming requests own body
limits, dispatch and cleanup. HTTP and RPC share the named calculator service operations.
The private `api/worker` export supplies native composition to the infrastructure
graph. The Website uses its private binding for SSR and checked public origin
for browser RPC; T003 is locally accepted by its dated connection acceptance review.
T009 exported tracing and provider/deployment proof remain open.

`packages/content`
: Private compiled owner of canonical docs page/navigation contracts, source
  errors, the accepted public catalogue Schema and `ContentService`. Application
  composition injects one checked catalogue; the service reads accepted pages,
  navigation and bounded search without filesystem or runtime execution. This
  owner does not perform source acceptance or compile MDX. HTTP and native RPC
  content groups consume this compiled contract instead of the source-only
  Fumadocs collection. The public path refinement and fixed page/search errors
  have one owner here. `ContentDiscovery` and its separate live/test composition
  derive the four discovery documents from the same catalogue and deferred
  checked stage settings. Shared public-origin policy and distinct Website
  identity live in its Schema owner; RPC retains a distinct API identity.

`packages/analytics`
: Private compiled owner of checked page/calculator events, collection policy,
  settings, safe errors and named browser/backend service contracts. Its native
  backend capture Layer has one bounded HTTP attempt. The application owns
  execution, best-effort delivery and successful-use placement; the Website
  owns its private browser SDK and relay; infrastructure owns retained provider
  projects. Calculators, rules and the local SDK have no analytics dependency.
  T008 application and provider qualification remain in progress; package tests
  alone do not prove browser privacy or ingestion.

`packages/docs-content`
: Implemented private source-only content package. It owns TaxKit docs
  authored MDX, authored navigation, meta, validation issues,
  validation errors, `DocsContentService`, the Fumadocs `source.config.ts`
  and the generated `.source/*` boundary. Its schema/error exports retain
  compatibility re-exports from `@taxkit/content`. Navigation decoding is independent
  of the Node-only validation module. Validation and generated raw-text access
  may read MDX files only through their explicit non-runtime operations; app
  routes use processed generated content through the service and client
  exports. Service interfaces use the precise `Contract` suffix.
  The independent native MDX index and `./catalogue-source` Layer belong only
  to the local accepted-catalogue builder. Request/browser code consumes its
  checked generated representation; it must not initialise that compiler.
  The package build emits the accepted JSON catalogue; `./public-catalogue`
  exports that value without importing the source compiler or live Layers.

`packages/docs-examples`
: Private owner of the four retained integration templates, additional checked
  public snippet sources and their
  compiler/runtime checks. It depends on HTTP, SDK and calculator contracts.
  Those dependencies stay outside docs-content so HTTP can consume content
  contracts without a circular build graph. It has no exports, generated
  content, service runtime or publication entrypoint. Its standard compiler
  build emits the templates without exporting a runtime package.

`packages/docs-fumadocs`
: Implemented private reusable package for generic Fumadocs integration. It
  owns Effect Schema to Standard Schema bridging, shared MDX compile config,
  the schema-decoded `FumadocsSource` service, safe tagged errors,
  generated-loader live and deterministic test Layers, and generic
  browser-safe MDX render primitives. It must not own TaxKit-specific
  frontmatter, navigation, validation policy, routes or generated content.
  Service interfaces use the precise `Contract` suffix.

## Runtime shape

Engine packages should be deterministic and reusable. Runtime-specific code
belongs in apps or explicitly server-only package exports.

## Guardrails

- Define canonical schemas in the owning package.
- Owning packages define canonical schemas, schema-derived types, branded ids,
  constructors, service tags and tagged errors. Non-owners may adapt unknown
  inputs at boundaries, but MUST import the canonical contracts instead of
  redeclaring object shapes or fields such as `id: string`.
- Define reusable config schemas in the package that owns the runtime contract,
  then compose and provide them from app-specific config modules.
- Import from the owner instead of redefining boundary values locally.
- Use another workspace's named public export. The global
  `package/no-cross-package-source-imports` rule rejects aliases and relative
  paths that reach into a different app or package's private `src` tree,
  including TaxKit's nested rule and transport packages.
- Add server-only exports for filesystem, HTTP server and Node adapters.
- Keep React in apps or docs packages only.
- Keep cross-package command orchestration in `packages/scripts`, but keep each
  validator and its domain policy with the package or app it validates.
- Keep repository path classification and safe reporting in
  `tools/repository-paths`; do not move it into package orchestration or browser
  code.
- Keep replacement app-specific MDX components in `apps/web`; old components
  remain with the retained legacy app until retirement. Promote only generic,
  repeated Fumadocs primitives to `packages/docs-fumadocs/render` or repeated
  TaxKit UI primitives to `packages/ui`.
- Do not add flat engine packages once nested domain or rule ownership exists.
  `packages/calculators` is allowed because it is a cross-surface
  orchestration package rather than a jurisdiction/domain/rule package.
- Keep HTTP handlers thin. Transport handlers may extract route parameters and
  call package-owned services, but reusable calculator lookup, metadata
  transformation, graph assembly, calculation dispatch and expected error
  shaping belong in service packages such as `packages/calculators`. The
  current calculate handler supplies the checked route ID, body and query to
  `PublicCalculatorService.calculate` once and maps only transport envelopes.

## Related docs

- [Package boundaries](./package-boundaries.md)
- [Effect services](./effect-services.md)
- [API and SDK](./api-and-sdk.md)


`@taxkit/infrastructure` also owns the separate native app candidate graph and
root secret selection through explicit source-only exports. It consumes the
API's named app export rather than reaching through a workspace filesystem
path. Engine, HTTP and RPC packages have no infrastructure dependency. The API
app retains ownership of native request/instance behaviour; root composition
retains provider and state selection.
