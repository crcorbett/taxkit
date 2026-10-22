---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-18
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
- `packages/analytics`
- `packages/api/http`
- `packages/api/mcp`
- `packages/api/rpc`
- `packages/calculators`
- `packages/content`
- `packages/core`
- `packages/docs-content`
- `packages/docs-examples`
- `packages/docs-fumadocs`
- `packages/infrastructure`
- `packages/observability`
- `packages/publication`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/sdk/typescript`
- `packages/testing`
- `packages/tsconfig`

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

`tools/repository-paths`
: Root-owned repository portability gate. It owns the closed machine-local path
  policy, schema-backed safe findings, typed local process and file failures,
  focused tests and Bun runtime entrypoint. It is not a reusable file-scanner
  package.

`packages/api/http`
: Implemented HTTP API package. It owns Effect HTTP API definitions, boundary
schemas, thin server handlers, OpenAPI and HTTP status/transport annotations.
Callers use Effect's generated `HttpApiClient` for its `TaxKitApi` directly;
`./in-process` supplies an in-process `HttpClient` for tests and examples. Its
narrow `request-boundary` export owns the shared streamed HTTP-body admission
used by the RPC and native app hosts, and `response-policy` owns the shared
public CORS and cache decision. The RPC package depends inward on that export
and retains its compatibility alias; the HTTP package has no RPC runtime
dependency.

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
single SDK archive and verify its imports in a fresh project, but package
manifests and exports remain owned by their packages. The distribution includes
the canonical HTTP contracts through an isolated `/http` entry; calculation
facades do not import it. HTTP transports call the
calculator service directly. SDK-owned tests compare the transport and facade
without a reverse HTTP-to-SDK dependency. Its Effect entrypoint owns
request-preserving calculator helpers such as `calculateRunRequest`,
`calculateReportRequest` and `calculateReport`, while reusing
calculator-owned `CalculatorRun*` schemas and `CalculatorServiceError`.

`apps/web`
: TanStack Start Website. It owns form presentation/commands, the server
  `ManagedRuntime`, the browser `ApiClient` Atom runtime and the shared
  registry. It reads the separate API through the generated HTTP client, over
  the private binding on the server and the public origin in the browser. Tax
  rules, calculations and content lookup remain package/API-owned. The app owns
  documentation page loaders, app-specific MDX composition, navigation/focus,
  search, Markdown representations, share images and responsive reading, and
  forwards discovery file requests to the API.

Root `alchemy.run.ts` and `alchemy.local.run.ts`
: The deployed and local-development roots for the Website/API graph; see
  [deployment](./deployment.md).

`packages/infrastructure`
: Private source-only owner of the native API/Website graph (`./apps-stack`),
  local stage Schema (`./stage`), Production hostnames and publication origin
  (`./hostnames`) and secret selection (`./secrets`), plus the
  separate retained PostHog project through the explicit `./posthog` export and
  `alchemy.posthog.run.ts`. Its private management adapter contains Distilled;
  application packages do not receive that client or its management
  credentials.

`apps/api`
: API application owner. It retains standalone Bun config/startup/shutdown
and the native Alchemy Worker. The native instance owns one router and
calculator service; incoming requests own body limits, dispatch and cleanup.
HTTP, RPC and MCP share the named calculator service operations; the Worker
also serves the discovery documents and authenticates the Website's private
canonical calculation HTTP requests. The private `api/worker` export supplies native implementation
to root `alchemy.apps.ts`; infrastructure owns the lightweight Worker declaration
and shared settings. `@taxkit/observability/edge-identity` owns shared edge caller
identity. Neither an app nor a package depends on another app.

`packages/observability`
: Private compiled, provider-free and domain-free owner (it depends on no
  other TaxKit workspace) of shared host request records, safe
  loggers, edge identity policy and the hosted `DeploymentStage` /
  `PullRequestStage` Schemas that analytics and infrastructure reuse. API, Website and infrastructure dashboards
  consume its named exports; machine RPC does not own host telemetry.

`packages/api/mcp`
: Private compiled MCP transport owner: tool contracts, handlers, request
  cancellation and response budgets over domain services. Native session storage,
  dispatch and app lifecycle remain in the API app.

`packages/api/rpc`
: Private compiled machine RPC transport with versioned calculator/documentation
  procedures, thin handlers and checked client Layers. Domain Schemas stay with
  Content, calculators and Publication; runtime composition remains app-owned.

`packages/publication`
: Private compiled discovery owner. `ContentDiscovery` and its static live/test
  Layers derive four documents from Content and checked publication/API settings.
  It consumes HTTP route constants for links; Content never imports HTTP and HTTP
  never imports Publication, keeping the dependency graph acyclic.

`packages/content`
: Private compiled owner of canonical docs page/navigation contracts, source
  errors, the accepted public catalogue Schema and `ContentService`. Application
  composition injects one checked catalogue; the service reads accepted pages,
  navigation and bounded search without filesystem or runtime execution. This
  owner does not perform source acceptance or compile MDX. HTTP and native RPC
  content groups consume this compiled contract instead of the source-only
  Fumadocs collection. The public path refinement and fixed page/search errors
  have one owner here. `./response-check` correlates an already-decoded page with
  its requested path. Shared public-origin policy lives in its Schema owner;
  RPC retains a distinct API identity.

`packages/analytics`
: Private compiled owner of checked page/calculator events, collection policy,
  settings, safe errors and named browser/backend service contracts. Its native
  backend capture Layer has one bounded HTTP attempt. The application owns
  execution and best-effort delivery. Analytics owns the calculator usage decorator
  and bounded relay; the Website owns its private browser SDK and mounts the relay.
  Infrastructure owns retained provider
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
  the schema-decoded `FumadocsSource` service, safe tagged errors, the static
  `FumadocsSourceLive` (over a supplied `FumadocsGeneratedCollection`) and
  `FumadocsSourceTest` (over `FumadocsSourceFixtures`) Layers, and generic
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
- Use another workspace's declared dependency and named public export. Native
  `package/workspace-import-boundaries` receives current manifest-derived
  exports and edges, including nested packages and peers. Direct cross-owner
  source paths are private. The separate `taxkit-package/workspace-roles` rule
  restricts Website source to contracts/clients and exact host module grants;
  new exports and dependency declarations cannot grant a browser/backend role.
  [Package boundaries](./package-boundaries.md) owns the policy and proof limits;
  `tools/oxlint/package-roles.ts` owns the enforced module grants.
- Add server-only exports for filesystem, HTTP server and Node adapters.
- Keep React in apps or docs packages only.
- Keep each validator and its domain policy with the package or app it
  validates; root `package.json` commands chain them.
- Keep repository path classification and safe reporting in
  `tools/repository-paths`; do not move it into package orchestration or browser
  code.
- Keep app-specific MDX components in `apps/web`. Promote only generic,
  repeated Fumadocs primitives to `packages/docs-fumadocs/render`. Create a
  shared TaxKit UI package only when apps repeat UI primitives.
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


`@taxkit/infrastructure` owns the native app graph and root secret selection
through explicit source-only exports. It has no application dependency. Root
`alchemy.apps.ts` joins the graph and the API's named implementation export;
the native Worker declaration and common compatibility settings live in deployment-only
exports. Engine, HTTP, RPC, MCP, analytics and observability packages have no
infrastructure dependency. The API app retains native request/instance behaviour;
root composition retains provider and state selection.
