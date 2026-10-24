---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-package-boundaries-owner
last_reviewed: 2026-10-18
review_trigger: package responsibility, dependency direction or public export change
---

# Package Boundaries

TaxKit should grow as a package-oriented monorepo for the open-source tax
engine, docs, API server and TypeScript SDK. Package dependencies must point
from foundational packages toward rule packages, API packages and apps. Engine
packages must stay deterministic and reusable.

This page is a target architecture, not a list of implemented packages.

## Current Package State

Implemented packages and apps:

- `apps/api`
- `apps/web`
- `content/docs`
- `packages/calculators`
- `packages/diagrams`
- `packages/docs-examples`
- `packages/mdx`
- `packages/core`
- `packages/api/http`
- `packages/api/mcp`
- `packages/content`
- `packages/aeo`
- `packages/og-image`
- `packages/webmcp`
- `packages/analytics`
- `packages/observability`
- `packages/sdk/typescript`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/infrastructure` (private, source-only deployment graph)
- `packages/testing`
- `packages/tsconfig`

The proposed package map below should guide new work, but callers should not
import from a planned package until the corresponding package exists with
exports and verification.

## Proposed Package Map

```txt
apps/
  api/
  web/

content/
  docs/

packages/
  core/
    primitives/
    facts/
    rules/
    graph/
    trace/

  domain/
    au/
      dates/
      pay/
      tax/
      super/
      deductions/
      fbt/
      mortgage/

  rules/
    au/
      pay/
      payg/
      stsl/
      super/
      income-tax/
      medicare/
      deductions/
      fbt/
      mortgage/

  calculators/

  api/
    http/

  sdk/
    typescript/

  content/
  mdx/
  diagrams/
  docs-examples/
  scripts/

  cli/
```

Current packages such as `@taxkit/api-http` and the TanStack Start app sit
outside the calculation engine. As the repo matures, the app layer should
settle into a public documentation site and reusable API server. They
will expose and consume engine capabilities once those capabilities exist, but
the deterministic engine must not import from them.

## Dependency Direction

```txt
packages/core/**
  <- packages/domain/**
  <- packages/rules/**
  <- packages/calculators/**
  <- packages/api/** / packages/sdk/** / packages/cli/** / apps/**
```

TaxKit packages and apps must not depend on other apps. Root composition joins
app implementation exports to deployment declarations; runtime observability and
analytics have no Alchemy/provider dependency. All non-infrastructure packages
remain free of deployment packages and management SDKs, including dependencies,
development, optional and peer dependencies. Apps may use Alchemy runtime
helpers; infrastructure owns provider deployment.
`tools/workspace/dependencies.boundary.test.ts` checks every actual workspace
manifest and rejects app peers as well as reverse application edges. React is
allowed only inside app/docs packages that explicitly need it.

## Package Responsibilities

Implemented `@taxkit/core` owns:

- branded primitives such as money, dates, percentages and ids
- fact descriptor helpers
- rule descriptor helpers
- graph metadata types
- trace and ledger types
- common tagged errors
- Effect `Context.Service` / `Layer` helpers
- calculation engine orchestration

Planned `@taxkit/domain-au-*` packages will own:

- Australian income years, FBT years and local date helpers
- pay periods and date dimensions
- Australian tax-domain facts that are not specific to one rule pack

Implemented `@taxkit/rules-au-pay` owns:

- gross pay, taxable pay, net pay and pay event facts
- pay-period conversions
- salary sacrifice effects where they affect pay calculations
- payslip reconciliation target facts, but not payslip parsing

Current PAYG withholding behavior is implemented inside
`@taxkit/rules-au-pay`. A later split to `@taxkit/rules-au-payg` should keep
canonical schemas, ids and parameter services with the owning package.

Planned `@taxkit/rules-au-payg` may own:

- ATO withholding schedule schemas
- PAYG withholding algorithms
- PAYG parameter table services
- PAYG withholding traces and golden tests

Implemented `@taxkit/rules-au-stsl` and
`@taxkit/rules-au-income-tax` own their corresponding facts, algorithms,
parameter tables and official rule packs. Planned `@taxkit/rules-au-super`,
`@taxkit/rules-au-medicare`, `@taxkit/rules-au-fbt`,
`@taxkit/rules-au-mortgage` and `@taxkit/rules-au-deductions` will own their
corresponding facts, algorithms, parameter tables and official rule packs.

Implemented `@taxkit/calculators` owns the reusable calculator orchestration
boundary for:

- reusable calculator catalog schemas and entries
- calculator service tags and live layers
- metadata projections for calculator, fact, rule and graph discovery
- schema-guided expected error shaping for calculation inputs
- composition of canonical scenario layers, rule-pack layers and
  `CalculationEngine`
- reusable service methods for HTTP handlers, SDK helpers, CLI commands and
  direct in-process consumers

It must not own OpenAPI annotations, HTTP status mapping, Bun serving, process
config, app runtime lifecycle, SDK client transport or CLI command parsing.

Implemented `@taxkit/api-http` owns:

- Effect HTTP API groups for public calculation endpoints
- thin server handlers that call package-owned API services
- OpenAPI generation
- API boundary schemas

HTTP API packages should not own calculator catalog transformations or
calculation business logic when a reusable API service package exists.

Implemented private `taxkit` owns:

- direct in-process calculation facade
- plain TypeScript `TaxKit.createClient(...)`, `TaxKit.calculate(...)` and safe helpers
- caller-owned client runtimes and explicit disposal; bounded one-shot helpers
- Effect-native `taxkit/effect` entrypoint
- jurisdiction-specific opt-in `taxkit/au` and `taxkit/au/effect` subpaths
- Layer-backed typed modules that preserve compile-time calculation, fact, rule and period capabilities
- typed declarations, provider Layers and bindings shared by plain and Effect entrypoints
- browser-safe types and schemas
- SDK examples and compatibility tests

Implemented source-only `@content/docs` owns:

- the authored TaxKit MDX pages and `navigation.json`
- `repository.json`, the GitHub revisions that repository-file links use
- `sources.ts`, every page as a `?raw` import

Implemented `@taxkit/mdx` owns:

- `DocsPageReaderLive` (`./live`): micromark MDX and GFM tables with a
  Schema-checked syntax tree; JSX, images, raw HTML and quotes fail
- `DocsCodeHighlighterLive` (`./highlights`), the only `@pierre/highlights`
  caller

Implemented `@taxkit/diagrams` owns:

- `DocsDiagramRendererLive` (`./mermaid`), the only `beautiful-mermaid` caller,
  which renders SVG on the server with no browser or Chromium

`@taxkit/content` declares the `DocsPageReader`, `DocsCodeHighlighter` and
`DocsDiagramRenderer` contracts these packages implement, and never imports
the implementations.

Docs packages must not own rule-pack algorithms, API endpoint business logic
or SDK calculation facades.

## Directory Naming

Directory paths should group packages by purpose first. Package names may use the same purpose prefix.

Examples:

```txt
packages/rules/au/payg       -> @taxkit/rules-au-payg
packages/rules/au/super      -> @taxkit/rules-au-super
packages/domain/au/dates     -> @taxkit/domain-au-dates
packages/api/http            -> @taxkit/api-http
packages/calculators         -> @taxkit/calculators
packages/sdk/typescript      -> taxkit or taxkit
content/docs                 -> @content/docs
packages/content             -> @taxkit/content
packages/mdx                 -> @taxkit/mdx
packages/diagrams            -> @taxkit/diagrams
```

Avoid flat package sprawl such as `packages/au-payg`, `packages/au-super` and
flat transport package names once the engine packages start growing.
`packages/calculators` is the exception for cross-surface calculator
orchestration because it is intentionally shared by HTTP, SDK, CLI and
in-process callers.

## Export Rules

Each package should expose isolated export paths. Avoid broad root barrels that accidentally mix server-only, client-only, API, SDK or docs code into deterministic calculation bundles.

Recommended shape:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./facts": "./src/facts/index.ts",
    "./rules": "./src/rules/index.ts",
    "./parameters": "./src/parameters/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

Server-only adapters and filesystem code must have explicit server-only export paths and must not be imported by browser-safe packages.

`tools/oxlint/workspaces.boundary.ts` reads the root workspace globs and each
actual manifest when Oxlint starts. It includes nested transport, SDK and rule
packages, preserves selected `source`/`import`/`node`/`default` export conditions,
wildcard subpaths and null fences, and derives undeclared dependency edges from
all four dependency fields. The native `package/workspace-import-boundaries`
rule enforces these facts for aliases, relative paths, imports, re-exports,
dynamic imports and type imports. Cross-owner file paths remain private even
when the destination file is an export target; use its package address. Root
composition can consume declared app exports; apps and packages cannot consume
another app.

The separate `taxkit-package/workspace-roles` rule owns frontend and deployment
roles. A public export or declared dependency does not make a backend handler,
server, domain live Layer or content compiler browser-safe. Website source uses
the contract/client modules listed in `tools/oxlint/package-roles.ts`. Exact host exceptions admit the existing
host telemetry, content settings and infrastructure binding types. These
exceptions do not bypass exports or declared-dependency checks. A Website
module is server-only when it imports TanStack Start's
`@tanstack/react-start/server-only` marker (or is `runtime.server.ts` or the
Worker host); only those may import Alchemy, and TanStack's import protection
keeps them out of the browser. Browser code also rejects local `.server`
imports; one exact grant keeps the isomorphic loader's `../runtime.server`
import, and neighbouring browser modules receive no such permission. Non-infrastructure package
source cannot acquire deployment/provider implementations. Domain-free runtime
support (`packages/observability`) cannot depend on or import any other TaxKit
workspace; consuming domains supply their Schemas, such as the calculator
admission key passed to `edgeCallerKey`. No package runtime SDK exception is
currently required.

The CLI fixtures in `tools/oxlint/workspace-imports.boundary.test.ts` exercise
accepted contracts/clients and actual host files, rejected backend/private and
undeclared imports, fresh manifest changes, peer dependencies, wildcard null
fences and conditional selection. This is syntactic import enforcement, not a
transitive browser bundler or arbitrary runtime module-address evaluator.
Unresolved Website module addresses fail the role check; the native baseline
checks statically resolved addresses.

## Out Of Scope For Engine Packages

Engine packages should contain tax-domain primitives, facts, rule packs, calculators, graph metadata, traces, validation fixtures and test helpers. Application-specific packages should stay outside the engine dependency graph.


Shared streamed HTTP-body admission belongs to the existing HTTP transport
package's narrow `request-boundary` export. The SDK exposes the same contracts through `/http` while
its calculation facades stay independent of HTTP. Native hosts compose
admission outside their HTTP routes; the retained standalone HTTP server
mounts it. The HTTP transport never depends on the SDK.
