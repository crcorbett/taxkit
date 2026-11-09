# Package Boundaries

Package dependencies point from foundational packages toward rule packages,
transport packages and apps. Engine packages stay deterministic and reusable.
[ARCHITECTURE.md](../../ARCHITECTURE.md#owners-and-imports) lists the apps and
packages, and [package ownership](./package-ownership.md) says what each owns.
This page owns the dependency direction and how it is enforced.

## Dependency Direction

```txt
packages/core
  <- packages/rules/**
  <- packages/calculators
  <- packages/api/** / packages/sdk/** / apps/**
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

## Responsibility limits

- `@taxkit/calculators` owns reusable calculator orchestration. It must not own
  OpenAPI annotations, HTTP status mapping, Bun serving, process configuration,
  app runtime lifecycle or SDK client transport.
- HTTP and MCP packages must not own calculator catalogue transformations or
  calculation logic; they call the calculator service.
- Docs packages (`@content/docs`, `@taxkit/content`, `@taxkit/mdx`,
  `@taxkit/mdx-react`, `@taxkit/diagrams`, `@taxkit/pele`) must not own rule-pack
  algorithms, API endpoint logic or SDK calculation functions.

## Directory Naming

Group package directories by purpose first; the package name uses the same
prefix, for example `packages/rules/au/pay` is `@taxkit/rules-au-pay` and
`packages/api/http` is `@taxkit/api-http`. The SDK at `packages/sdk/typescript`
is published as `taxkit`. Avoid flat names such as `packages/au-pay`.
`packages/calculators` is the one flat engine package, because HTTP, MCP, the
SDK and in-process callers share it.

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
the contract/client modules listed in `tools/oxlint/package-roles.ts`. Exact host module grants, declared as
rule options in `oxlint.config.ts`, admit the existing host telemetry, content
settings and infrastructure binding types. These
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

The HTTP contract is an input to the SDK assembly: the role policy forbids
`packages/api/http` from depending on `taxkit` in any dependency field, and
`strict-effect/module-ownership` lets only `packages/sdk/typescript/src/http.ts`
import `@taxkit/api-http` within SDK source. `tools/workspace` also fails on a
workspace-glob folder without a manifest, other than the named grouping
folders, and on a package export that points into `test/`.

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
