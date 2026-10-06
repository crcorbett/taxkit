---
document_type: repository-readme
lifecycle: current
authority: canonical
owner: taxkit-repository-maintainers
last_reviewed: 2026-10-05
review_trigger: contributor setup, repository entry points, or supported commands change
---

# TaxKit

TaxKit is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The repo is early, but the main public integration surfaces now exist. The
implemented surface includes the retained standalone Bun API and a native
API/Website candidate with a take-home-pay form, a Fumadocs-backed docs app, an Effect HTTP API package
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
- [apps/docs](./apps/docs/README.md): retained old documentation app for its
  existing deployment/recovery procedure, pending source/build retirement.
- [apps/web](./apps/web/README.md): Native TanStack Website candidate with a take-home form,
  private server binding and direct checked browser RPC to the API. It also
  renders accepted documentation, search, discovery, Markdown and share images
  and owns the current release documentation journey.
- [packages/api/http](./packages/api/http/README.md): Effect HTTP API contract,
  generated docs, public calculator routes, thin handler adapters, server
  handler exports and browser-safe client exports.
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
- [packages/scripts](./packages/scripts/README.md): private Effect-native
  orchestration package for the complete local release-readiness command.
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
The checkpoint destination is a local setting for this clone. A push through
`origin` can also trigger a separate checkpoint upload to that destination.
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
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=docs dev
bun run check:doppler-custody
bun run --filter=docs test:cloudflare-built
bun run check:repository-paths
bun run check:harness-governance
bun run check:docs
bun run knip:production
bun run verification
bun run test:skills
bun run release:check
bun run changeset
bun run version-repo
```

`bun run dev` builds the API dependencies, then starts the native API and
Website together using `alchemy.apps.local.run.ts`. Alchemy prints both local
addresses and supplies the matching browser origin and private server binding.
It uses local state and an isolated local profile directory; it requires no
Cloudflare or Doppler login. App source edits reload automatically. After
editing a shared package, rebuild that package before expecting its compiled
API exports to change. Stop the pair with Ctrl-C.

`bun run --filter=api dev` retains the separate Bun HTTP process through
portless at `https://api.taxkit.localhost`. The [Website README](./apps/web/README.md)
owns its standalone fixture, generated types and native checks. Use `bun run
web:test:native-pair` for the saved built and live development journeys.
`bun run --filter=docs dev`
is the credentialed, Alchemy-managed Cloudflare development path. It requires a
repository-scoped Doppler login and an authorised `taxkit/dev` config, runs the
pass/fail-only `bun run check:doppler-custody` check first during onboarding,
and starts only a local `dev_<user>` Alchemy stage. It does not authorise or
prove a provider change. Use `bun run --filter=docs dev:vite` for the fast,
credential-free docs app at `https://docs.taxkit.localhost`. `bun run
--filter=docs test:cloudflare-built` builds the exact Cloudflare target and
exercises an isolated copy of its Worker/assets under local workerd; it does
not access provider credentials or prove a deployment. `bun run
check:repository-paths` rejects machine-local checkout references in tracked
readable text without printing the matched private value. `bun run check:docs`
checks maintainer metadata, links, documented commands, workspace README
coverage, public/maintainer path separation, and generated-source ownership.
It treats public content status as opaque and does not establish publication,
availability, accuracy, or accepted-current truth. `bun run
check:harness-governance` validates the repository-local harness profile,
accepted HE crosswalk, skill-tree receipt, allowed overlays, relative Claude
links, local skill references, critical journeys, and external non-claims. It
does not read a global skill installation or establish remote Git, hosted CI,
registry, release, deployment, provider, public-site, or external-consumer
state. `bun run knip:production`
checks the release-artifact package, repository command and
API runtime graph without test or development reachability. `bun run
verification` is the baseline verification command for documentation, package
wiring and scaffold changes and includes repo-owned skill policy checks. `bun
run test:skills` runs that focused stale-pattern suite directly. `bun run
release:check` runs the complete ordered
release evidence, including tests, builds, package artifacts, API smoke, docs
browser proof and Changeset status.

Deterministic repository commands run through Turbo, including the root
validators used by `verification` and the app/package checks used by
`release:check`. Trusted GitHub Quality runs fetch the minimum `taxkit/ci`
config through the pinned Doppler action after every cache save, check the safe
project/config identity, and pass only the named Turbo outputs to the canonical
release step. Same-repository pull requests and `main` may read and write
Vercel Remote Cache. Fork pull requests do not fetch Doppler and run the same
full command graph with local cache only. Local repository commands use local
cache and do not have a supported direct Turbo credential path. Never put a
cache credential in the shell, source or an env file, and never treat a cache
hit as test, release, deployment or public-availability proof. The repository
`DOPPLER_CI_TOKEN` bridge is the sole hosted Turbo source.

Quality also keeps separate GitHub caches for Bun package downloads and the
Playwright Chromium binary. It does not cache `node_modules`: current warm
hosted evidence shows the frozen Bun install takes only 1–2 seconds after the
package cache restores, while the installed tree is about 1.4 GB. The workflow
still runs frozen install plus Playwright system-dependency setup on every run.
Keys use platform and dependency content, so pull requests may restore a
matching cache saved by `main`. GitHub keeps pull-request writes on the
pull-request merge ref, away from `main` and sibling pull requests. A miss or
cache outage only changes download time.

The trusted docs Preview, Production, teardown and receipt workflows use
bounded Turbo caching for deterministic work. Receipt validation and Preview
get their two Turbo values from `taxkit/ci` after cache saves; teardown stays
local-cache-only. Preview and teardown get Cloudflare values only from
`taxkit/stg_preview` through the Preview environment bridge and expose them
only to exact provider steps. Production uses its separate protected
`taxkit/prd` bridge and keeps its fixed `prod` plan/deploy/rollback controls.
All deployment and receipt uploads use separate allowlisted directories so raw
runner output is not retained. The TaxKit Doppler configs and GitHub bridges
are established. Merged-main Quality and exact absent-stage teardown proof are
recorded in the deployment evidence index; that evidence does not claim a
served Preview or Production deployment under this credential epoch.

Package-facing changes must include a Changeset. Use `bun run changeset` during
implementation to record the user-facing package impact, and use
`bun run version-repo` only when intentionally consuming pending Changesets into
fixed release-train package versions and changelogs.

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

- `apps/api` is the API runtime owner. It creates one process-lifetime
  `ManagedRuntime`, serves `packages/api/http` through Bun and disposes scoped
  resources on shutdown.
- `apps/web` owns the replacement documentation reader over the accepted
  backend catalogue and compiled MDX. Canonical page fields and reusable
  Fumadocs internals remain package-owned. `apps/docs` is retained for its
  separately bounded legacy deployment/recovery route.
- `apps/web/src/lib/runtime.server.ts` owns one server runner. React's Atom
  registry owns browser execution and cleanup. Both use native RPC to the
  separate API; the Website contains no calculation fallback.
- `@taxkit/api-http/client` and `@taxkit/api-http/client/live` are
  browser-safe.
- `@taxkit/api-http/client/server`, `@taxkit/api-http/server` and handler
  exports are server-only and should stay out of `apps/web`.
