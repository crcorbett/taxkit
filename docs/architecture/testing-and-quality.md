---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-22
review_trigger: test command, check coverage, native test or deployment check change
---

# Testing and quality

TaxKit quality depends on deterministic calculation tests, package boundary
tests, graph validation, trace snapshots, public contract tests and a working
Website/API. Detailed rule-package expectations live in
[Testing and validation](./testing-and-validation.md).

## The checks

| Command | What it shows |
| --- | --- |
| `bun run verification` | Before merging. The five checks in order: `build`, `lint`, `check-types`, `knip` and `test`. |
| `bun run build` | Every workspace build, including the API's docs catalogue. |
| `bun run lint` | Formatting, type-aware Oxlint with the boundary-directive pass, documentation links/commands and portable paths. |
| `bun run check-types` | Workspace, Alchemy-root and tool types, and Effect diagnostics. |
| `bun run knip` | The development and production Knip graphs. |
| `bun run test` | Root tool tests (including the actual-Oxlint rule fixtures), unit tests in every workspace, Website and SDK tests in Chromium, then the required credential-free native pair suite (`test:native`): both apps built and run together in Miniflare for first HTML, docs pages, Markdown, discovery files, share images, browser calculation, the no-JavaScript notice, MCP and request limits. |
| `bun run release:check` | `verification`, including the native pair suite, plus packed SDK, downstream consumer, API smoke, docs validation and Changeset status. Run it before a package release. |

The Checks workflow runs `verification` once per revision in its `checks` job;
the Preview and Production deploy jobs `need` that job and deploy the same
commit, so they start only after it succeeds. Its final `test:native` builds
and tests the native pair only after the earlier builds and source-rewriting
tests have finished. A native failure fails `checks`, so no deploy job reaches
deployment credentials, planning or apply. Do not run these artifact-owning
checks concurrently in one checkout. The native suite covers request-scoped MCP
progress and async context across requests, shared work/rate limits, reply
cleanup and the Website's refusal of POSTs.

`tools/infrastructure/release-gates.boundary.test.ts` executes the real root
command composition with safe leaf replacements and reads the workflow. It
checks native build/test ordering, proves that a failing native suite fails
verification and later release checks, and requires every Preview/Production
plan or deploy job to need `checks`, check out the verified commit and never
repeat verification. Each credential-using job checks its Doppler token is set
before other work and gives the token only to native commands. Every `--yes`
apply or destroy follows a matching-stage native plan without `--yes`.

Effect diagnostics run inside every workspace's `check-types`, because the
`prepare` script (`effect-tsgo patch --oxlint`) patches TypeScript and Oxlint with the
Effect language service; `check-types` ends with `check:effect`, a smoke check
that the patch and plugin are active. `bun run lint` runs type-aware checks and the published Commonplace
`strict-effect` policy from the latest `@commonplaces/oxlint-plugin`, including the
native request rules `static-layers`, `no-loader-request-state`,
`no-native-client-replica`, `native-cloudflare-cache`, `website-data-proxy`,
`website-rpc-boundary` (`apps/web/src` only) and `module-ownership`. Their
accept/reject fixtures are in `tools/oxlint/native-request-rules.test.ts`, run
by `bun run test:tools`.

The Chromium tests need the browser that matches the pinned Playwright, as CI
installs it: run `apps/web/node_modules/.bin/playwright install chromium` once.
An older Chromium lacks WebMCP, so the native browser-tools test fails on it.

Focused checks are the owning workspace's `test`, `check-types` and
`test:browser` scripts. Rule and calculator changes need their golden and
boundary tests; HTTP contract changes need `bun run --filter=@taxkit/api-http test`
and an updated OpenAPI snapshot.

## What each kind of change needs

- **Tax rules, facts and calculators**: the rule package's golden scenarios,
  threshold/date-boundary tests and calculator catalogue tests. A wrong answer
  is the most serious failure TaxKit can have.
- **Public package contracts**: type tests, the OpenAPI snapshot, a Changeset,
  and the [packed consumer check](../runbooks/packed-consumer-proof.md) for SDK
  exports or dependencies.
- **Website or API runtime, bindings or client lifetime**: focused unit and
  browser tests, then `bun run test:native`.
- **Infrastructure**: `bun run check-types` covers the Alchemy roots. A native
  plan (`bun run pr:plan pr-<number>` or `bun run production:plan`) shows the
  intended resource changes before a deployment.
- **Documentation**: `bun run lint` (its `check:docs` step); public MDX is also checked by
  `apps/api/test/docs-sources.test.ts` and
  `packages/docs-examples/test/published-snippets.test.ts` in `bun run test`.

## Checks that stay separate

Local checks do not show hosted behaviour. After a deployment, check the
deployed Website and API directly, as the [deployment runbook](../runbooks/deployment.md)
describes: page and API responses, browser CORS, browser calculation, the
no-JavaScript notice, `www` redirects and Cloudflare cache hits.

A green check also does not show that a package was published. Do not turn a
failing meaningful check into a pass by removing its assertion or raising a
timeout without understanding the failure.

## Guardrails

- Tests use deterministic Layers and `TestClock`; ordinary unit tests do not
  use the live network or wall-clock sleeps.
- Every expected error branch and every Schema boundary has a test.
- Browser and native tests check cancellation, cleanup and response limits,
  not only the successful path.
- Privacy tests check that logs, traces and analytics never contain salaries,
  supplied facts, results or calculation traces.

## Related docs

- [Testing and validation](./testing-and-validation.md)
- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Deployment](./deployment.md)
- [Tooling standard](../standards/tooling.md)

The pinned shared package includes the AST-identity and Match-factory
corrections; TaxKit keeps no vendored rule fork.
`native-request-rules.test.ts` exercises both factory spellings through the real
CLI and a large cyclic host AST; no production or test Layer-factory exemption
is introduced.
