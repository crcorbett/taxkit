---
document_type: agent-router
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-20
---

# TaxKit repository guide

TaxKit is the public monorepo for the open-source tax engine, API, SDK, and
documentation site. Start with [`docs/README.md`](docs/README.md), the
maintainer-document and truth-layer router. `CLAUDE.md` points to this
file; edit `AGENTS.md` only.

## Operating loop

1. Read `docs/README.md`, then only the owner document for the task.
2. Confirm the claim against code, configuration, Schemas, exports or the
   running system it describes.
3. Put current implementation intent in an active SPEC and plan; delete them
   when the work is done. Git keeps the history.
4. Update the owner document and its pointers in the same change.
5. Run focused checks while working and `bun run verification` before merging.
   Public package changes also need a Changeset.
6. Use ordinary Git commits and pull requests. Describe what changed, the
   checks that ran and anything not checked.

For a material calculator, rule, Schema, SDK, HTTP/OpenAPI, public docs,
package, command, deployment, SPEC or plan change, decide which documents
change; maintainers with the shared plugin can use
`development-workflows:docs-maintainer` for that.

## Task routes

- Repository and package topology:
  [`docs/architecture/README.md`](docs/architecture/README.md), then
  [`docs/architecture/package-ownership.md`](docs/architecture/package-ownership.md).
- Effect services and boundaries:
  [`docs/architecture/effect-services.md`](docs/architecture/effect-services.md)
  and the applicable package README.
- API/SDK: [`docs/architecture/api-and-sdk.md`](docs/architecture/api-and-sdk.md),
  [`apps/api/README.md`](apps/api/README.md), and
  [`packages/sdk/typescript/README.md`](packages/sdk/typescript/README.md).
- Calculators/rules/facts: the focused owner under `docs/architecture/` and the
  owning package README.
- Frontend/public docs:
  [`docs/architecture/frontend.md`](docs/architecture/frontend.md),
  [`docs/architecture/content-and-posts.md`](docs/architecture/content-and-posts.md),
  and [`apps/web/README.md`](apps/web/README.md).
- Current work: [`docs/product-specs/index.md`](docs/product-specs/index.md) and
  [`docs/exec-plans/active/README.md`](docs/exec-plans/active/README.md).
- Standards, tests, and release checks:
  [`docs/standards/README.md`](docs/standards/README.md) and
  [`docs/architecture/testing-and-quality.md`](docs/architecture/testing-and-quality.md).
- Versioning, packed SDK checks and Website/API deployment:
  [`docs/runbooks/README.md`](docs/runbooks/README.md).
- References: [`docs/references/README.md`](docs/references/README.md).

Use the shared `development-workflows:linear` skill when work is tracked in
Linear.

## Engineering guardrails

- Use Effect-native Schema, branded identities, Config, services, Layers,
  tagged errors, collections, Command, and runtime primitives when they own the
  semantics. Decode unknown/representation ingress once and encode egress at
  explicit boundaries.
- Reuse owning Schemas and schema-derived types. Do not mirror raw `id: string`,
  DTOs, provider types, primitive semantic config, or unchecked SDK output.
- Keep primary Effects flat, sequential, and pipe-first where that clarifies
  data flow. Keep one-use mapping/decoding/error logic inline; reject
  helper/common/utils sprawl and generic SDK callback wrappers.
- Keep service contracts, live Layers, test Layers, and executable composition
  separate. Do not run Effects or build live Layers inside domain logic.
- Provider clients expose named Effect operations, `Config.schema` with
  redacted secrets, immediate Schema decoding, safe tagged errors without
  `instanceof`, and live/mock Layers.
- React composition flows route → policy-owning container → focused leaf.
  Routes own transport restoration/outcome matching, containers own commands
  and coordination, and leaves render readonly values/local interaction state.
- Admit an abstraction only with semantic weight, an owner, a real reuse or
  substitution point, a simpler call graph, and focused proof.

## Operations

Tool access is not permission. Deploying, publishing packages, changing
credentials or deleting provider resources needs the maintainer's explicit
request for that operation. Local checks do not show that a deployment or
publication works; check the deployed Website/API or registry directly.

Use `bun run verification` before merging and `bun run release:check` before
publishing packages. Roll back a deployment by redeploying the previous working
commit with the same native command.

## Shared development skills

Use the [shared development skills](docs/skills.md) relevant to the task.
Repository paths, commands and ownership come from the manifests, code and
documentation linked above.
