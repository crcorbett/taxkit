# TaxKit documentation profile

Read this profile after `AGENTS.md` and `docs/README.md`. Paths and commands
below are repository-local; resolve the checkout with `git rev-parse --show-toplevel`.

## Owner map

| Change class                                        | Earliest owner and required pointers                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintainer lifecycle, truth layers, archive routing | `docs/README.md`; architecture, standards, audit and active intent only when affected                                                                                                                                                                                                                                           |
| Calculator rules, facts and schemas                 | owning `packages/calculators` or `packages/rules/**` source/README; relevant `docs/architecture/**`, SDK/API/public docs only when consumers change                                                                                                                                                                             |
| SDK exports and examples                            | `packages/sdk/typescript` source/export map and README; packed-consumer/downstream proof; `docs/architecture/api-and-sdk.md`                                                                                                                                                                                                    |
| HTTP/OpenAPI                                        | `packages/api/http/src/**` schemas and `src/openapi.ts`; generated snapshot `packages/api/http/__snapshots__/openapi.json` through `test:openapi`; `packages/api/http/README.md`, `apps/api/README.md`, and API/SDK architecture only when their contracts change                                                               |
| Public MDX/navigation/lifecycle                     | `apps/docs/content/**`, `apps/docs/navigation.json`, and `tools/documentation/owner-policy.json`; `published` requires one exact `public.statusDecision.acceptanceRecords` binding to a strict addressable record, with the durable lifecycle decision routed from `docs/documentation-audit/hgi-207/public-mdx-lifecycle.json` |
| Public docs runtime/generated Fumadocs              | `apps/docs/README.md`, `packages/docs-content/source.config.ts`, `packages/docs-content/.source`, and `packages/docs-fumadocs`; regenerate/check through the owning commands and never hand-edit generated output                                                                                                               |
| Package/app roots                                   | owning package/app README, package ownership architecture, root routes only when discoverability changes                                                                                                                                                                                                                        |
| Commands, CI, versioning and release readiness      | `package.json`, workflow/command owner, `docs/standards/versioning.md`, `docs/runbooks/README.md`, testing-quality architecture and proof owner                                                                                                                                                                                 |
| Runbooks, authority, proof and history              | exactly four target-owned procedures routed by `docs/runbooks/README.md`; `docs/operations/authority-model.md`; `tools/documentation/runbook-contract.json`; sanitized `docs/evidence/releases/**`; or dated `docs/documentation-audit/**`; preserve provenance and non-claims                                                  |
| PRD and implementation                              | target SPEC, sibling tasks and active plan; local `prd-writer`, `prd-review`, `prd-implementer` invoke this skill                                                                                                                                                                                                               |

Public `published` needs an exact accepted record and one-to-one binding in
`tools/documentation/owner-policy.json`; its `targetPath` must equal the public
path. Navigation remains independently draft unless it receives its own exact
record and binding.
Generated source is authoritative over checked output. Repository evidence is
not provider, registry, deployment, public-site or consumer proof.

## Commands and boundaries

- Baseline documentation/path/skill checks: `bun run test:skills`, `bun run
check:docs`, `bun run check:runbooks`, `bun run check:repository-paths`.
- Full local closeout: `bun run verification` and `git diff --check`.
- Public content/runtime: `bun run docs:validate`, `bun run docs:build`,
  `bun run --filter=docs test:browser` when applicable.
- SDK package boundary: `bun run --filter=@taxkit/sdk check-packed-artifact`
  and `bun run --filter=@taxkit/sdk validate:downstream` when applicable.
- Release evidence: `bun run release:check` is local proof only; versioning,
  publication and deployment remain separately authorized operations.
- Runbook contract: `bun run check:runbooks` is inspect-only and writes the
  bounded ignored `tmp/runbook-validation-report.json`; it never runs a
  documented procedure or establishes external state.

For each check, state its observable postcondition and what it does not prove.
Keep background freshness reports as candidates until an attached implementation
authority, responsible reviewer and separately named publisher accept them.
