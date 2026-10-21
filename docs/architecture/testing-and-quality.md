---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-21
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
| `bun run verification` | Before merging. Build, format, lint, workspace and Alchemy-root types, Effect diagnostics, unit tests, Chromium tests, both Knip graphs, documentation links/commands and portable paths, then the required credential-free native pair suite. |
| `bun run test` | Unit tests in every workspace plus the root tool tests, including the actual-Oxlint rule fixtures. |
| `bun run test:browser` | Website and SDK tests in Chromium: Atom registry lifetime, calculator commands, loader cancellation and SDK browser imports. |
| `bun run test:native` | Builds the API and Website and runs them together in Miniflare: first HTML, docs pages, Markdown, discovery files, calculation with and without JavaScript, MCP and request limits. |
| `bun run release:check` | `verification`, including the native pair suite, plus packed SDK, downstream consumer, API smoke, docs validation and Changeset status. Run it before a package release. |

The Checks, Preview and Production jobs all require `verification` to succeed.
Its final `test:native` builds and tests the native pair only after the earlier
builds and source-rewriting tests have finished. A native failure stops the job
before deployment credentials, planning or apply. Do not run these artifact-owning
checks concurrently in one checkout. The native suite covers request-scoped MCP
progress and async context across requests, shared work/rate limits, reply
cleanup and the Website's private HTTP identity boundary.

`tools/infrastructure/release-gates.boundary.test.ts` executes the real root
command composition and workflow gate commands with safe leaf replacements.
It checks native build/test ordering and proves that a failing native suite
prevents Preview/Production planning and deployment and later release checks.
It also checks that each Preview/Production job tests its Doppler secret is set
before any other step, gives the token only to native commands, and runs every
`--yes` deploy or destroy only after the same stage has run without `--yes`.

Effect diagnostics run inside every workspace's `check-types`, because the
`prepare` script (`effect-tsgo patch`) patches the TypeScript compiler with the
Effect language service; `bun run check:effect` is a smoke check that the patch
and plugin are active. `bun run lint` applies the vendored Commonplace
`strict-effect` policy (`tools/oxlint/vendor/strict-effect`), including the
native request rules `static-layers`, `no-loader-request-state`,
`no-native-client-replica`, `native-cloudflare-cache`, `website-data-proxy`,
`website-rpc-boundary` (`apps/web/src` only) and `module-ownership`. Their
accept/reject fixtures are in `tools/oxlint/native-request-rules.test.ts`, run
by `bun run test:tools`.

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
- **Documentation**: `bun run check:docs`; public MDX also needs
  `bun run docs:validate`.

## Checks that stay separate

Local checks do not show hosted behaviour. After a deployment, check the
deployed Website and API directly, as the [deployment runbook](../runbooks/deployment.md)
describes: page and API responses, browser CORS, calculation with and without
JavaScript, `www` redirects and Cloudflare cache hits.

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

The strict-policy vendor [provenance](../../tools/oxlint/vendor/strict-effect/README.md)
records the local Effect 4.0.2 AST-identity and Match-factory corrections.
`native-request-rules.test.ts` exercises both factory spellings through the real
CLI and a large cyclic host AST; no production or test Layer-factory exemption
is introduced.
