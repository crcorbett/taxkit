---
document_type: agent-router
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-07-21
---

# TaxKit repository guide

TaxKit is the public monorepo for the open-source tax engine, API, SDK, and
documentation site. Start with [`docs/README.md`](docs/README.md), the sole
maintainer-document lifecycle and truth-layer router. `CLAUDE.md` points to this
file; edit `AGENTS.md` only.

## Operating loop

1. Read `docs/README.md`, then only the semantic owner for the task.
2. Confirm the claim against code, configuration, Schemas, exports, generated
   owners, or external readback at the boundary it describes.
3. Put current implementation intent in a SPEC/task and active execution plan;
   never reopen completed work as policy.
4. Update the earliest durable owner and required pointers in the same slice.
5. Run `bun run check:docs`, `bun run check:runbooks` when operations changed,
   focused checks, and `bun run verification`;
   package-facing changes also need an appropriate Changeset.
6. Retain artifact identity, authority, postconditions, limitations,
   non-claims, and rollback.

For any material calculator/rule/schema, SDK/export/example, HTTP/OpenAPI,
public MDX/navigation/runtime, package/app, command/CI/versioning/release-proof,
lifecycle, SPEC, plan, runbook, or skill change, invoke the repository-local
`$docs-maintainer` route before accepting the slice. Record `Change required`,
`Preserve`, or evidenced `N/A` for its documentation impact. Scheduled or
background freshness work is report-only candidate output unless a separately
attached implementation authority names the reviewer and publisher.

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
  and [`apps/docs/README.md`](apps/docs/README.md).
- Current work: [`docs/product-specs/index.md`](docs/product-specs/index.md) and
  [`docs/exec-plans/active/README.md`](docs/exec-plans/active/README.md).
- Standards, tests, and release checks:
  [`docs/standards/README.md`](docs/standards/README.md) and
  [`docs/architecture/testing-and-quality.md`](docs/architecture/testing-and-quality.md).
- Repeatable release, versioning, packed-consumer and recovery operations:
  [`docs/runbooks/README.md`](docs/runbooks/README.md) and
  [`docs/operations/authority-model.md`](docs/operations/authority-model.md).
- References and audits: [`docs/references/README.md`](docs/references/README.md)
  and [`docs/documentation-audit/README.md`](docs/documentation-audit/README.md).

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

## Authority and proof

Tool access is capability, not authority. Provider, registry, publication,
release, deployment, credential, and destructive operations require a named
principal, operation, resource, environment, approval boundary, receipt,
rollback/revocation, and readback. Local gates do not prove publication,
production, or external consumer behavior.

Use `bun run check:repository-paths` for checkout portability and
`bun run verification` for repository closeout. Use `bun run release:check`
only for its documented local release-evidence graph; it does not authorize or
prove publication.
