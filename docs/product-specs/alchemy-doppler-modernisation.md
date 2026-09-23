---
document_type: product-spec
lifecycle: current
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-09-23
review_trigger: Alchemy, Effect, Doppler, deployment, or proof contract change
---

# Alchemy and Doppler modernisation

## Goal and current state

Move the existing docs deployment graph to one private infrastructure owner,
upgrade Alchemy and the matching Effect v4 family, and retain one bounded
Doppler source for governed credentials. The starting revision is
`d91d295477a3ac587499a2845afae5daa5768f18` on `origin/main`.
That revision has no infrastructure package. The earlier local package work
was not merged and is not current repository truth.

```ts
Current deployment
GitHub workflow or local cloud command
  -> root alchemy.run.ts
    -> apps/docs/src/lib/build/cloudflare-stack.ts
    -> Cloudflare.Website.Vite("DocsWebsite")
  -> tools/docs-deployment independent plan and provider readback
```

```ts
Target deployment
GitHub workflow or local cloud command
  -> fixed Doppler configuration and named credential outputs
  -> root alchemy.run.ts (provider, state, stage composition)
    -> @taxkit/infrastructure (stage, Website policy, one-resource stack)
      -> Cloudflare.Website.Vite("DocsWebsite")
  -> tools/docs-deployment independent plan and provider readback
```

## Ownership and constraints

- `alchemy.run.ts` owns provider and state wiring and runs the stack. The
  private, source-only `@taxkit/infrastructure` package owns the deployment
  stage Schema, stable `TaxKitDocsCloudflare` stack name,
  `DocsWebsite` resource identity, Website options and returned outputs.
  `apps/docs` owns Vite and the Worker application, without an Alchemy
  runtime or development dependency. The app's hosted proof checks the
  environment-stage pair independently, and its built-output oracle asserts
  expected compatibility settings without importing the graph. Deployment
  tools import the owning stage Schema and identity through package exports.
- Keep the one Website resource, stage names (`dev_<user>`, `pr-N`,
  `prod`), Cloudflare state owner, compatibility date and flags, asset
  routing and headers, memo inputs, observability settings and URL output.
  Do not add DNS, Axiom, bindings or new runtime secrets.
- Upgrade to published `alchemy@2.0.0-beta.79` and the compatible exact
  `effect`, `@effect/platform-bun`, `@effect/platform-node` and
  `@effect/vitest@4.0.0-rc.117` family, subject to frozen install,
  installed-type checks and full local proof. Alchemy beta.79 declares Effect
  rc.115 or later as a peer. Verify companion transitive packages and lockfile.
  Reference source: Alchemy tag `v2.0.0-beta.79` at
  `473c39591c7993a708199d0ef8f0d38416885dde`; Effect v4 source
  at `14a3f140095fdebbff9162944fe7d4ea83e054e6` with package
  `4.0.0-rc.117`. These are release evidence, not runtime proof.
- Decode host and provider input once using the installed Effect v4 Schema
  and Config APIs. Keep named operations, typed expected failures, redaction,
  flat Effects and application-owned runtime composition. Do not add a generic
  SDK wrapper, command layer or utility package.
- Doppler remains the source of `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`, `TURBO_TEAM` and `TURBO_TOKEN` in the relevant
  fixed configs. GitHub's `DOPPLER_CI_TOKEN` and environment-specific
  `DOPPLER_PROVIDER_TOKEN` are the narrow bootstrap bridges. GitHub's
  ephemeral `github.token` is host-issued and is not a Doppler secret.
  Alchemy's state bearer remains Alchemy-owned. The docs Worker has no runtime
  secret. Never put secret values in source, logs, cache keys, artefacts or
  receipts.
- Local Vite development stays credential-free. Local cloud development
  retains checkout-scoped personal Doppler login, `taxkit/dev`, exact named
  outputs, no ambient selection, no fallback and no Bun env-file loading.
  Preview uses `stg_preview` and `pr-N`; Production uses `prd` and
  `prod`. Keep least-privilege scoped service tokens and separate protected
  GitHub environments. Do not turn a local Alchemy plan into permission to
  mutate Cloudflare.

## Reference decisions

| Pattern | Decision | Reason |
| --- | --- | --- |
| Site private infrastructure package and thin root composition | Adopt | It gives the resource graph one owner. |
| Site Axiom, DNS and secret graph | Avoid | TaxKit has no matching consumer or approved resource. |
| Site direct local Doppler wrapper | Adapt | TaxKit's existing fixed local adapter has stricter fallback and ambient-value controls. |
| DAW's current Alchemy and Effect pins | Adopt after local checks | Its release source matches the current npm tags; TaxKit must still qualify its own graph. |
| DAW app-owned Cloudflare graph and broad root scripts | Avoid | TaxKit already has independent deployment policy and readback tooling. |

## Ordered delivery and proof

1. Move the unchanged Website declaration, stage and identity to the private
   infrastructure package. Update direct imports, declaration tests, package
   boundaries, deployment input digests and canonical docs together.
2. Upgrade the exact Alchemy and Effect family and lockfile. Migrate only APIs
   that fail installed-type and behaviour checks, including tagged errors,
   Website props and OpenAPI naming. Preserve historical beta.64 captures;
  bind current parser tests to the new version. Keep the beta.64 captures as
  historical evidence; do not relabel those captures as beta.79 output.
  Current-version captures require a fresh sanitised, version-identified
  plan. If that cannot be obtained under the authority model, record the
  parser's hosted proof as unqualified and stop before deploying.
3. Reconcile the credential inventory, workflow named-output contract,
   local cloud adapter and runbook. Remove any confirmed duplicate direct
   credential source only after fresh metadata readback and replacement proof.
   Do not print values. Keep bootstrap, rotation, revocation, rollback and
   recovery steps exact.
4. Run focused checks per slice; then frozen install, lint, types,
   production dependency graph, deployment tests, secret-negative checks,
   local Vite and Worker behaviour, workflow contracts, docs checks and
   `bun run verification`. Obtain a separate provider plan and hosted
   Preview/Production proof under the authority model before claiming live
   parity. Commit, PR and merge only after required checks and authority.

Rollback is the previous exact source and lockfile with unchanged resource
identity. Before any provider apply, compare a fresh plan with existing state,
stop on replacement or deletion, and retain the accepted source and state
readback. After a failed mutation, inspect state before replay.

## Documentation impact

| Surface | Decision and owner |
| --- | --- |
| SPEC, task ledger and active plan | Change required: this document, sibling tasks, indexes and active plan. |
| Architecture and package ownership | Change required: `docs/architecture/deployment.md`, `package-ownership.md`, `package-boundaries.md`. |
| READMEs | Change required: new package, `apps/docs/README.md`, `tools/docs-deployment/README.md`; root README preserved if discovery remains through docs router. |
| Runbook and authority | Change required: `docs/runbooks/docs-deployment.md` for version and exact operations; preserve `docs/operations/authority-model.md`. |
| Commands, CI, config, tests | Change required where direct imports, digests, plan fixtures or versions change; preserve approval and protected environment boundaries. |
| Public MDX, API/SDK contracts, calculators | N/A unless installed Effect changes the generated OpenAPI; then update the generated owner and its tests, without changing public semantics. |
| Skills and agent instructions | Change required: add the new source-only infrastructure exception to the local package-structure profile; preserve other skill rules and `AGENTS.md`. |
| Historical proof | Preserve: dated beta.64/provider observations remain historical; new evidence names candidate, environment, limits and non-claims. |
| Changeset | Change required if a published package's installed behaviour changes; the private infrastructure package alone does not need one. |

## Acceptance

- One resource and stable identities; no app dependency on Alchemy; root
  composition is small and package exports resolve in a frozen install.
- Current plan fixtures, stage rejection, Preview/Production isolation,
  readback and secret-negative outputs pass. Every credential has one named
  source, consumer and bootstrap exception.
- Canonical docs, tasks and plan agree with code. `bun run check:docs`,
  `bun run check:runbooks`, `bun run check:repository-paths` and full
  verification pass, with exact receipts and no unsupported hosted claim.
