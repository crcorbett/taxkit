---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-documentation-owner
last_reviewed: 2026-09-23
review_trigger: task progress, version, proof, provider authority, or lifecycle change
---

# Alchemy and Doppler modernisation

The [SPEC](../../product-specs/alchemy-doppler-modernisation.md) and
[task ledger](../../product-specs/alchemy-doppler-modernisation.tasks.json)
own the accepted target and order. This plan records progress and bounded
proof. Starting point: clean isolated worktree from
`origin/main` `d91d295477a3ac587499a2845afae5daa5768f18`.

| Task | State | Evidence and next action |
| --- | --- | --- |
| ADM-001 infrastructure owner | Locally verified | Private source-only owner, root composition, imports, workflow input digests and docs changed together. Exact provider parity remains unproved. |
| ADM-002 release upgrade | Locally verified; hosted plan open | Exact Alchemy beta.79, Effect rc.117 and Vitest 5.0.1 installed. API, browser, Worker, release CI and full local checks pass. A fresh beta.79 provider plan capture is still required before any deployment. |
| ADM-003 Doppler reconciliation | Locally verified; token scope open | Live project/config and secret-name metadata, GitHub secret-name metadata, workflow consumers and local adapter agree. No credential source changed. Token scope/expiry and this checkout's personal login remain unproved. |
| ADM-004 delivery | Pending | Local proof, reviewed PR, authorised hosted proof and exact remote-main readback. |

## Research readback

- The starting root declares one `Cloudflare.Website.Vite("DocsWebsite")`.
  Stage and Website policy are in `apps/docs/src/lib/build`; deployment
  tooling imports that app path. The earlier local infrastructure package
  was not pushed and is absent from current main.
- Site has a private infrastructure package and a small root composition,
  with a larger Axiom and DNS graph that TaxKit does not need. DAW pins the
  release candidates used here but keeps its smaller graph app-owned.
- Exact local source clones match Alchemy tag `v2.0.0-beta.79` at
  `473c39591c7993a708199d0ef8f0d38416885dde` and Effect package
  `4.0.0-rc.117` at `14a3f140095fdebbff9162944fe7d4ea83e054e6`.
  Npm tags and Alchemy's rc.115+ peer constraint were read on 2026-09-23.
- Current workflows use fixed Doppler `ci`, `stg_preview` and `prd`
  config identities and named Cloudflare/Turbo outputs. This is source
  inspection, not a claim about current token validity or provider state.
- Read-only GitHub metadata through principal `crcorbett` on 2026-09-23
  showed repository secret name `DOPPLER_CI_TOKEN` and one
  `DOPPLER_PROVIDER_TOKEN` name in each of the Preview and Production
  environments. The separate teardown environment had no secret name.
  GitHub does not return write-only values; this does not prove the token
  contents, expiry, Doppler scope or Cloudflare access.
- `bun run check:doppler-custody` failed with safe reason `scoped-token`
  in this new worktree. Local cloud development needs its own
  checkout-scoped personal login before it can be claimed.

## SPEC review

Review on 2026-09-23 compared the draft with the package profile,
deployment tooling, app build assertions, release-source Website types and
the historical beta.64 capture owner. It added an explicit package-profile
update, kept infrastructure-only imports out of the app, and required fresh
version-matched plan evidence before hosted deployment. The reviewed SPEC
is current for repository implementation. No provider operation is approved
by this review.

## ADM-001 local proof

- `bunx bun@1.3.14 install --frozen-lockfile`: passed for the private
  package slice; exact pinned Bun binary reported `1.3.14`.
- `bun run --filter=@taxkit/infrastructure check-types` and
  `test`: passed, including 17 policy tests.
- `bun run test:docs-deployment`: 93 passed; the tracked-file input
  list includes the new package and teardown computes the same input roots.
- `bun run --filter=docs test`: 11 app tests and 14 hosted-proof
  boundary tests passed after the app was made independent of infrastructure.
- `bun run verification`: passed locally. Its isolated release-boundary
  test needed filesystem access for a nested temporary Bun install; the
  sandboxed run stopped at that install, while the permitted run passed.
- `bun run check:docs`, `bun run check:repository-paths`,
  `bun run knip`, `bun run knip:production`, lint and formatting passed.
  The skill-profile change has an intentionally updated SHA-256 receipt in
  `tools/skills/canonical-skill-baseline.json`.
- No Changeset is required for this slice: the new package is private and
  source-only, and no published package export or installed behaviour changed.

These are local source and test results. No Alchemy plan, Cloudflare
state, hosted Worker, Doppler token or public URL was checked by them.

## ADM-002 local proof and open boundary

- `bunx bun@1.3.14 install --frozen-lockfile`, `bun run verification`,
  `bun run test`, `bun run docs:build` and
  `bun run --filter=docs test:cloudflare-built` passed. The built Worker
  returned SSR 200, immutable asset 200 and missing-page 404 locally.
- `bun run release:check -- --ci` passed all nine ordered local checks,
  including the packed SDK consumer, standalone API smoke, browser route
  journey and Changeset status. This mode creates no release attempt or
  publication receipt. The non-CI mode correctly rejected the retained
  HGI-203 packet, whose journey-inventory digest already differs on
  `origin/main`; that packet is not a new candidate.
- Effect rc.117 requires `Schema.TaggedError`, upper-case primitive `Config`
  constructors and Bun's supplied HTTP server Layer. Alchemy beta.79 uses
  `workersDev: true` instead of the former Website `url` option. Current
  source and installed types were checked. Vitest 5's browser test runs React
  in its ordinary test mode and asserts only the two expected TanStack route
  warnings for rejected loader Effects.
- The generated OpenAPI document now names encoded component references with
  an `Encoded` suffix and nests the tax-year union one level deeper. The
  committed snapshot, API owner and Changeset record that change. API route
  paths, status codes and JSON field names were checked through route tests
  and standalone smoke.
- The retained beta.64 plan captures and failed-apply receipt remain bound to
  their historical version. The parser's current version constant is beta.79,
  and local parser tests pass, but no fresh sanitised beta.79 plan capture was
  obtained. Do not dispatch a Preview, Production or teardown provider run
  from this revision until version-matched plan output has been captured and
  reviewed under the resource-specific authority model.

## ADM-003 credential inventory

Read-only Doppler metadata on 2026-09-23 showed project `taxkit` and exactly
`ci`, `dev`, `stg_preview` and `prd` configurations. `doppler secrets
--only-names` showed the following names; Doppler's automatic
`DOPPLER_PROJECT`, `DOPPLER_CONFIG` and `DOPPLER_ENVIRONMENT` metadata also
appeared in each configuration. No secret value was read or printed.

| Config | Governed names | Exact consumer |
| --- | --- | --- |
| `ci` | `TURBO_TEAM`, `TURBO_TOKEN` | Trusted Quality, receipt, Preview and Production Turbo steps through repository `DOPPLER_CI_TOKEN`. |
| `dev` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Local cloud development after checkout-scoped personal login; no service token bridge. |
| `stg_preview` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Preview and teardown provider steps through the Preview environment `DOPPLER_PROVIDER_TOKEN`. |
| `prd` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Production provider steps through the Production environment `DOPPLER_PROVIDER_TOKEN`. |

Read-only GitHub metadata showed only the repository `DOPPLER_CI_TOKEN` name
and separate `DOPPLER_PROVIDER_TOKEN` names in the protected Preview and
Production environments. Workflow source checks the fixed project/config
metadata before passing named outputs to consumers. The local adapter strips
ambient Doppler and provider values, selects only `taxkit/dev`, disables
fallback and Bun env-file loading, and accepts only the two Cloudflare names.
The current checkout's `check:doppler-custody` stopped with safe reason
`scoped-token`; local cloud development is unqualified here. Metadata alone
does not prove bridge token scope, expiry or value. No direct duplicate secret
source was found to remove, and no GitHub or Doppler setting was changed.

## Authority and limits

Repository implementation and local checks are authorised by this task.
Before bootstrap, plan or apply against Cloudflare, identify the exact
principal, operation, resource, environment, approval boundary, receipt,
rollback/revocation and readback under
[the authority model](../../operations/authority-model.md). Do not copy
secret values into this plan. Frozen install or a green local plan is not
hosted proof.

## Documentation impact

Use the SPEC ledger for `Change required`, `Preserve` and `N/A` rows.
Update the earliest durable owner within each task, run
`bun run check:docs` and `bun run check:runbooks` for changed operations,
and record exact command outcomes here.
