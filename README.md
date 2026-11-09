# TaxKit

TaxKit is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The engine, the API, the Website with three calculators and the
documentation, and the `taxkit` SDK all exist. The SDK includes the engine,
Australian rules and typed HTTP contracts in one package, with Effect as its
only external runtime dependency.

```sh
npm install taxkit
```

Use `taxkit/au` for Australian calculations and `taxkit/money` for checked
money values. The [SDK guide](./packages/sdk/typescript/README.md#public-paths)
lists every entry point.

## Apps and packages

[ARCHITECTURE.md](./ARCHITECTURE.md#owners-and-imports) lists every app and
package and what it owns. [Package ownership](./docs/architecture/package-ownership.md)
and [package boundaries](./docs/architecture/package-boundaries.md) explain the
import rules.

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

`bun run verification` is the check to run before merging. It runs the five
checks in order: `build`, `lint` (formatting, Oxlint, documentation links and
portable paths), `check-types` (with Effect diagnostics), `knip` and `test`
(tool, unit and browser tests, then the native Website/API pair suite). `bun run release:check` adds the packed SDK,
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
- [ARCHITECTURE.md](./ARCHITECTURE.md): apps, packages, requests, runtimes,
  caching and deployment.
- [Maintainer documentation](./docs/README.md): the short index of owners and
  decisions.
- [CLAUDE.md](./CLAUDE.md): imports `AGENTS.md` for Claude Code.
- [CHANGELOG.md](./CHANGELOG.md): root release-train changelog. Package-level
  changelogs live beside each implemented package, and public app/API
  changelogs live beside the owning app.
- Engineering conventions start with [Effect services](./docs/architecture/effect-services.md),
  [Configuration](./docs/architecture/configuration.md), [Package ownership](./docs/architecture/package-ownership.md)
  and [Code patterns](./docs/standards/code-patterns.md).
- Finished plans and reports live in Git history, not in documents.

## Runtime boundary

- `apps/api` is the API runtime owner. Its standalone entry runs through
  `BunRuntime.runMain`, serves `packages/api/http` through Bun and disposes
  scoped resources on shutdown; its native Worker serves HTTP and MCP.
- `apps/web` owns the documentation reader over the API's checked
  catalogue. It renders each page's checked reading body; canonical
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
