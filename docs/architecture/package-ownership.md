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
- `content/docs`
- `packages/aeo`
- `packages/analytics`
- `packages/api/http`
- `packages/api/mcp`
- `packages/calculators`
- `packages/content`
- `packages/core`
- `packages/diagrams`
- `packages/docs-examples`
- `packages/infrastructure`
- `packages/mdx`
- `packages/observability`
- `packages/og-image`
- `packages/webmcp`
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
used by the native app hosts, and `response-policy` owns the shared
public CORS and cache decision.

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
: The sole TypeScript package configured for public npm installation as `taxkit`.
It owns browser-safe schemas, typed calculation facades,
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

The private repository root is named `@taxkit/workspace` to keep its workspace
identity distinct from `taxkit`, the sole public npm package.

`apps/web`
: TanStack Start Website. It owns form presentation/commands, the server
  `ManagedRuntime`, the browser `ApiClient` Atom runtime and the shared
  registry. It reads the separate API through the generated HTTP client, over
  the private binding on the server and the public origin in the browser. Tax
  rules, calculations and content lookup remain package/API-owned. The app owns
  documentation page loaders, reading-body rendering, navigation/focus,
  search, Markdown representations, share images and responsive reading, and
  forwards discovery file requests to the API.

Root `alchemy.run.ts`
: The one root for the Website/API graph, deployed and in local development; see
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
HTTP and MCP share the named calculator service operations; the Worker
also serves the discovery documents and the Website's private read-only
binding. The private `api/worker` export supplies native implementation
to root `alchemy.apps.ts`; infrastructure owns the lightweight Worker declaration
and shared settings. `@taxkit/observability/edge-identity` owns shared edge caller
identity. Neither an app nor a package depends on another app.

`packages/observability`
: Private source, provider-free and domain-free owner (it depends on no
  other TaxKit workspace) of shared host request records, safe
  loggers, edge identity policy and the hosted `DeploymentStage` /
  `PullRequestStage` Schemas that analytics and infrastructure reuse. API, Website and infrastructure dashboards
  consume its named exports.

`packages/api/mcp`
: Private source MCP transport owner: tool contracts, handlers, request
  cancellation and response budgets over domain services. Native session storage,
  dispatch and app lifecycle remain in the API app.

`packages/aeo`
: Private source answer-engine owner. `aeoRoutes` serves the four discovery
  documents and one share-image route per published page from Content's
  catalogue, `DocsOgImages` and the host-supplied `PublicationOrigins`. It
  consumes HTTP route constants; Content never imports HTTP and HTTP never
  imports AEO, keeping the dependency graph acyclic.

`packages/webmcp`
: Private source WebMCP owner. `ModelContextHost` and its live adapter are the
  one browser Promise bridge for page tools; `registerCalculatorPageTools`
  registers the calculator page toolkit for the enclosing Scope.

`packages/og-image`
: Private source build-time share-image provider. `DocsPageRendererLive`
  keeps every Takumi call and the bundled Geist font; `renderDocsImageArchive`
  draws every published page. Only the API build script composes it; no Worker
  bundles it.

`packages/content`
: Private source owner of canonical docs page/navigation contracts, source
  errors, the accepted public catalogue Schema and `ContentService`. Application
  composition supplies `DocsSources`; `ContentCatalogueLive` builds the checked
  catalogue once through `DocsPageReader` from the build-only `./catalogue`
  export; the separate runtime `./live` service reads accepted
  pages, navigation and bounded search from it. It owns the checked reading
  `body`, link resolution (`src/links.ts`) and the processed Markdown writer
  (`src/reading-markdown.egress.ts`). Its `ContentMdxReaderLive` implements `DocsPageReader` over MDX contracts;
  `ContentLinkResolverLive` applies publication policy from checked targets.
  The app selects concrete compiler, renderer and provider Layers. The HTTP content group consumes this
  compiled contract. The public path refinement and fixed page/search errors
  have one owner here. `./response-check` correlates an already-decoded page with
  its requested path. Shared public-origin policy lives in its Schema owner.

`packages/analytics`
: Private source owner of checked page/calculator events, collection policy,
  settings, safe errors and named browser/backend service contracts. Its native
  backend capture Layer has one bounded HTTP attempt. The application owns
  execution and best-effort delivery. Analytics owns the calculator usage decorator.
  Infrastructure owns retained provider
  projects. Calculators, rules and the local SDK have no analytics dependency.
  T008 application and provider qualification remain in progress; package tests
  alone do not prove browser privacy or ingestion.

`content/docs`
: Private source-only `@content/docs` package with the 62 authored `.mdx`
  pages, `navigation.json`, `repository.json` (the GitHub revisions that
  repository-file links use) and `sources.ts` (every page as a `?raw` import).
  It has no Schemas, services or runtime.

`packages/mdx`
: Private source `@taxkit/mdx`: content-neutral `MdxCompiler.compile` and
  `MdxRenderer.render`, static individual Layers and combined `MdxLive`.
  MDX owns portable versioned documents and provider contracts; the compiler
  requires no providers. `./highlights` owns every Pierre call. Content imports
  only these contracts and Schemas, while the app selects implementations.
  See [the package](../../packages/mdx/README.md).

`packages/diagrams`
: Private source `@taxkit/diagrams`. Static `MermaidDiagramRendererLive`
  implements MDX's `DiagramRenderer`; it is the only `beautiful-mermaid` caller
  and draws SVG without a browser. It does not import Content.

`packages/docs-examples`
: Private owner of the four retained integration templates, additional checked
  public snippet sources and their
  compiler/runtime checks. It depends on HTTP, SDK and calculator contracts.
  Those dependencies stay outside Content so HTTP can consume content
  contracts without a circular build graph. It has no exports, generated
  content, service runtime or publication entrypoint. Its standard compiler
  build emits the templates without exporting a runtime package.

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
- Keep docs presentation components in `apps/web`. Create a shared TaxKit UI
  package only when apps repeat UI primitives.
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
exports. Engine, HTTP, MCP, analytics and observability packages have no
infrastructure dependency. The API app retains native request/instance behaviour;
root composition retains provider and state selection.
