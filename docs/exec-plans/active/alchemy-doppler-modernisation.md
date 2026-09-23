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
| ADM-002 release upgrade | Pending | Published tags read: Alchemy beta.79 and Effect rc.117. Verify installed APIs, frozen install, fixtures and broad checks. |
| ADM-003 Doppler reconciliation | Pending | Inventory current named sources and consumers; read metadata without values. |
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
