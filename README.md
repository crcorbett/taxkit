---
document_type: repository-readme
lifecycle: current
authority: canonical
owner: taxkit-repository-maintainers
last_reviewed: 2026-10-13
review_trigger: contributor setup, repository entry points, or supported commands change
---

# TaxKit

TaxKit is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The repo is early, but the main public integration surfaces now exist. The
implemented surface includes the standalone Bun API, the native Cloudflare
API and Website with three calculators and the accepted documentation, an Effect HTTP API package
with health, generated docs, metadata and public calculation endpoints, a
reusable calculator orchestration package, deterministic core engine
primitives, Australian pay, income-tax and STSL rule packages, the installable
`taxkit` TypeScript SDK, the authored `@content/docs` pages, private
`@taxkit/content`, `@taxkit/mdx` and `@taxkit/diagrams` packages, shared
testing helpers and shared TypeScript config. The SDK includes the engine, Australian rules and typed HTTP contracts
in one package, with Effect as its only external runtime dependency.

```sh
npm install taxkit
```

Use `taxkit/au` for Australian calculations and `taxkit/core` for checked money
values. See the [SDK guide](./packages/sdk/typescript/README.md) for all eight
entry points.

## What exists today

- [apps/api](./apps/api/README.md): standalone Bun process that owns API
  startup, listening config and Effect runtime teardown for `/api/*`.
- [apps/web](./apps/web/README.md): TanStack Start Website with the three
  calculators, reading the API through the generated HTTP client over the
  private server binding and, in the browser, the public API origin. It also
  renders accepted documentation, search and Markdown, and forwards discovery
  files and share images to the API.
- [packages/api/http](./packages/api/http/README.md): Effect HTTP API contract,
  generated docs, public calculator routes, thin handler adapters, server
  handler exports, the shared CORS/cache policy and the browser-safe `api`
  export for generated clients.
- [packages/calculators](./packages/calculators/README.md): reusable public
  calculator orchestration package for catalog metadata, graph construction,
  calculation dispatch and schema-guided expected error shaping.
- [packages/api/mcp](./packages/api/mcp/README.md): native MCP tool contracts,
  handlers, cancellation and response budgets.
- [packages/aeo](./packages/aeo/README.md): the API's answer-engine routes:
  `robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt` and share images,
  derived from the accepted Content catalogue.
- [packages/webmcp](./packages/webmcp/README.md): registers the Website's
  calculator page tools with the browser's WebMCP host.
- [packages/og-image](./packages/og-image/README.md): the Takumi share-image
  renderer and its bounded cache, behind Content's `DocsOgImages` contract.
- [packages/observability](./packages/observability/README.md): shared safe host
  telemetry and edge identity, independent of deployment providers.
- [packages/sdk/typescript](./packages/sdk/typescript/README.md): the public
  `taxkit` package with plain, safe-result, Effect and AU entry points.
- [content/docs](./content/docs/README.md): private source-only `@content/docs`
  package with the authored MDX pages, navigation, repository link revisions
  and the raw page list.
- [packages/content](./packages/content/README.md): private docs page Schemas,
  checked reading body, link resolution, catalogue and content service.
- [packages/mdx](./packages/mdx/README.md): private MDX page reader and code
  highlighter that implement Content's contracts.
- [packages/diagrams](./packages/diagrams/README.md): private server-side
  Mermaid to SVG renderer that implements Content's diagram contract.
- [packages/core](./packages/core/README.md): deterministic engine primitives,
  schema-backed facts, rule descriptors, graph validation, trace and ledger
  contracts and calculation engine service.
- `packages/rules/au/*`: implemented Australian pay, annual income-tax and
  STSL rule packages with Effect rule layers, official parameter services,
  calculators and golden tests.
- [packages/testing](./packages/testing/README.md): shared test helpers for
  workspace packages.
- [packages/tsconfig](./packages/tsconfig/README.md): shared TypeScript config
  presets.

## Planned package families

The architecture docs describe the intended package families for the tax engine:
core primitives and facts, domain models, rule packs, API clients, SDKs, docs
tooling and supporting app shells. Treat those as planned architecture unless a
matching package root and package README say otherwise.

Start with:

- [Architecture overview](./docs/architecture/README.md)
- [Package ownership](./docs/architecture/package-ownership.md)
- [Package boundaries](./docs/architecture/package-boundaries.md)
- [API and SDK architecture](./docs/architecture/api-and-sdk.md)

## AI work history

[Entire](https://entire.io/gh/crcorbett/taxkit) records Codex and Claude Code
conversations and tool activity alongside Git commits. TaxKit and these chat
records are public.
Keep credentials out of chats: Entire removes detected secrets, but detection
is not a guarantee.

Install Entire on each machine, then run from the checkout:

```sh
entire enable --agent codex --telemetry=false --absolute-git-hook-path
entire enable --agent claude-code --telemetry=false --absolute-git-hook-path
entire status
entire doctor
```

Open `/hooks` in Codex and review the seven Entire commands, then start a fresh
chat. Start a fresh Claude Code chat too. The shared settings are
`.entire/settings.json`, `.codex/hooks.json` and `.claude/settings.json`.
Anonymous usage reporting is off and commit linking is set to `always`.
Each clone needs its own Git recording commands and Codex approvals. Local
logs, working transcripts and machine-specific settings are ignored by Git.

This repository has an Entire connection in Australia (Sydney). Keep `origin`
as the direct GitHub remote and add the regional remote in another clone:

```sh
entire repo remote add entire /gh/crcorbett/taxkit --cluster aws-ap-southeast-2.entire.io
entire enable --agent codex --telemetry=false --absolute-git-hook-path --checkpoint-push-remote entire
```

Finish the normal workflow with `git commit` and `git push entire BRANCH`.
Entire uploads chat checkpoints and forwards source changes to GitHub.
The shared `strategy_options.checkpoint_push_remote` selects `entire`, so new
working copies inherit that upload destination. An ignored
`.entire/settings.local.json` override takes priority; keep it set to `entire`
too. Check that `entire status` names `entire`. A push directly to the GitHub
`origin` skips chat uploads. New chat activity after a push waits for the next
push through `entire`.
Ending a chat alone does not prove that it was published. Check the hosted
Sessions page for its conversation and linked commit.

The native importer supports past Codex and Claude Code chats. Preview first
with `entire import codex --dry-run` and `entire import claude-code --dry-run`.
It normally scans the previous 30 days; use `--path` and `--session` for selected
history. Repeated imports skip turns already imported. Old checkout locations
and compressed Codex archives need selected temporary copies; preserve the
originals. Imported chats are read-only in Entire. Ordinary Claude web and
desktop chats have no direct importer in this CLI version.

See [Entire's setup guide](https://docs.entire.io/quickstart),
[import guide](https://docs.entire.io/guides/sessions/import-past-agent-history)
and the repository's [Entire settings](./.entire/settings.json).

## Commands

```sh
bun install
bun run dev
bun run verification
bun run release:check
bun run changeset
bun run version-packages
```

`bun run dev` starts the native API and Website together with
`alchemy dev` in the isolated `dev_native_apps` stage. Alchemy prints both
local addresses and supplies the browser API address and private server binding.
It uses local state and needs no Cloudflare or Doppler login. Stop it with
Ctrl-C. `bun run --filter=api dev` starts the separate Bun HTTP host.

`bun run verification` is the check to run before merging: build, formatting,
lint, types, Effect diagnostics, unit and browser tests, unused-code checks,
documentation links and portable paths. `bun run test:native` runs the slower
native Website/API pair tests. `bun run release:check` adds the packed SDK,
downstream consumer, API smoke and Changeset checks before a package release.
The [testing guide](./docs/architecture/testing-and-quality.md) lists focused
checks for each kind of change.

The `Checks` GitHub workflow runs `bun run verification` once per pull request
revision and `main` commit, then deploys a same-repository pull request's
Preview or `main`'s Production from that checked commit. Trusted runs read the
Turbo cache values from Doppler `taxkit/ci`; fork pull requests run without
credentials and get no deploy.

Deployments use native Alchemy and Doppler, from those jobs or locally on the
maintainer's request; see the
[deployment runbook](./docs/runbooks/deployment.md). Package-facing changes need
a Changeset; see [versioning](./docs/runbooks/versioning.md).

## Documentation entry points

- [AGENTS.md](./AGENTS.md): short atlas for agents and task routing.
- [Maintainer documentation](./docs/README.md): truth layers, semantic
  owners and public/maintainer separation.
- [CLAUDE.md](./CLAUDE.md): Claude-compatible pointer to the canonical root
  operating rules.
- [CHANGELOG.md](./CHANGELOG.md): root release-train changelog. Package-level
  changelogs live beside each implemented package, and public app/API
  changelogs live beside the owning app.
- Engineering conventions start with [Effect services](./docs/architecture/effect-services.md),
  [Configuration](./docs/architecture/configuration.md), [Package ownership](./docs/architecture/package-ownership.md)
  and [Code patterns](./docs/standards/code-patterns.md).
- [Product specs](./docs/product-specs/index.md) and
  [exec plans](./docs/exec-plans/README.md): active work only; finished work
  lives in Git history.
- [Design docs](./docs/design-docs/index.md): documentation and design
  conventions.
- [References](./docs/references/README.md): external or imported reference
  material.

## Runtime boundary

- `apps/api` is the API runtime owner. Its standalone entry runs through
  `BunRuntime.runMain`, serves `packages/api/http` through Bun and disposes
  scoped resources on shutdown; its native Worker serves HTTP and MCP.
- `apps/web` owns the replacement documentation reader over the accepted
  backend catalogue. It renders each page's checked reading body; canonical
  page fields and MDX reading remain package-owned.
- `apps/web/src/lib/runtime.server.ts` owns one server runtime; the browser
  `ApiClient` Atom runtime and one shared registry own browser execution and
  cleanup. Both read the separate API with Effect's generated `HttpApiClient`;
  the Website contains no calculation fallback.
- `@taxkit/api-http/api` is browser-safe; use it with
  `HttpApiClient.make(TaxKitApi, { baseUrl })`.
- `@taxkit/api-http/server`, `@taxkit/api-http/in-process` and handler
  exports are server-only and should stay out of `apps/web`.

## Licence and trademarks

TaxKit's code and documentation are available under the [MIT licence](./LICENSE).
The licence grants no rights to the TaxKit name or the Stand mark. Cooper
Corbett keeps both, and [TRADEMARKS.md](./TRADEMARKS.md) sets out how others
may use them.
