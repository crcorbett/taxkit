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
primitives, Australian pay, income-tax and STSL rule packages, a private
TypeScript SDK package, private `@taxkit/docs-content` and
`@taxkit/docs-fumadocs` packages, shared testing helpers and shared TypeScript
config, plus private Effect-native repository release orchestration in
`@taxkit/scripts`. The SDK is implemented for local and downstream
validation, but it is not published yet.

## What exists today

- [apps/api](./apps/api/README.md): standalone Bun process that owns API
  startup, listening config and Effect runtime teardown for `/api/*`.
- [apps/docs](./apps/docs/README.md): retirement tombstone and retained-source
  recovery route; no active documentation workspace.
- [apps/web](./apps/web/README.md): TanStack Start Website with the three
  calculators, reading the API through the generated HTTP client over the
  private server binding and, in the browser, the public API origin. It also
  renders accepted documentation, search, Markdown and share images and
  forwards discovery files to the API.
- [packages/api/http](./packages/api/http/README.md): Effect HTTP API contract,
  generated docs, public calculator routes, thin handler adapters, server
  handler exports, the shared CORS/cache policy and the browser-safe `api`
  export for generated clients.
- [packages/calculators](./packages/calculators/README.md): reusable public
  calculator orchestration package for catalog metadata, graph construction,
  calculation dispatch and schema-guided expected error shaping.
- [packages/sdk/typescript](./packages/sdk/typescript/README.md): private
  TypeScript SDK package with plain, safe-result, Effect and AU entrypoints.
- [packages/docs-content](./packages/docs-content/README.md): private
  source-only content package for docs frontmatter, navigation, validation,
  generated source access and the docs content service.
- [packages/docs-fumadocs](./packages/docs-fumadocs/README.md): private
  reusable package for generic Fumadocs configuration, source adapters and
  MDX render primitives.
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
- [packages/ui](./packages/ui/README.md): documented planned shared UI
  ownership without a package manifest or runtime code yet.

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
and the [setup spec](./docs/product-specs/entire-session-history.md).

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

The `Checks` GitHub workflow runs `bun run verification` on pull requests and
`main`. Trusted runs read the Turbo cache values from Doppler `taxkit/ci`; fork
pull requests run without credentials.

Deployments run locally with native Alchemy and Doppler; see the
[deployment runbook](./docs/runbooks/deployment.md). Package-facing changes need
a Changeset; see [versioning](./docs/runbooks/versioning.md).

## Documentation entry points

- [AGENTS.md](./AGENTS.md): short atlas for agents and task routing.
- [Maintainer documentation](./docs/README.md): lifecycle, truth layers,
  semantic owners, public/maintainer separation and known owner gaps.
- [CLAUDE.md](./CLAUDE.md): Claude-compatible pointer to the canonical root
  operating rules.
- [CHANGELOG.md](./CHANGELOG.md): root release-train changelog. Package-level
  changelogs live beside each implemented package, and public app/API
  changelogs live beside the owning app.
- Engineering conventions start with [Effect services](./docs/architecture/effect-services.md),
  [Configuration](./docs/architecture/configuration.md), [Package ownership](./docs/architecture/package-ownership.md)
  and [Code patterns](./docs/standards/code-patterns.md).
- [Product specs](./docs/product-specs/index.md): current, implemented and
  historical intent inventory and task lists.
- [Exec plans](./docs/exec-plans/README.md): live and completed rollout plans.
- [Design docs](./docs/design-docs/index.md): documentation and design
  conventions.
- [Documentation audit](./docs/documentation-audit/README.md): current docs
  inventory, README coverage, missing docs and migration priorities.
- [References](./docs/references/README.md): external or imported reference
  material.

## Status snapshot

[docs/repo-status-outline.html](./docs/repo-status-outline.html) is a local,
static status snapshot for a quick visual overview. It is useful for review in a
browser, but it is not canonical; refresh it when repo structure or implemented
surfaces materially change.

Open it directly at:

```text
open docs/repo-status-outline.html
```

## Runtime boundary

- `apps/api` is the API runtime owner. Its standalone entry runs through
  `BunRuntime.runMain`, serves `packages/api/http` through Bun and disposes
  scoped resources on shutdown; its native Worker serves HTTP, RPC and MCP.
- `apps/web` owns the replacement documentation reader over the accepted
  backend catalogue and compiled MDX. Canonical page fields and reusable
  Fumadocs internals remain package-owned. `apps/docs` is a
  retirement tombstone; exact original source and deployed recovery identities
  remain historical evidence.
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
