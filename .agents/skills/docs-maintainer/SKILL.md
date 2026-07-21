---
name: docs-maintainer
description: "Maintain TaxKit documentation after material calculator, schema, SDK/export, HTTP/OpenAPI, public MDX/navigation, docs-runtime, package, CI, release-proof, lifecycle, SPEC, or operational changes. Use for documentation-impact assessment, stale generated or package docs, documentation audits, ordinary implementation slices, and PRD design, review, implementation, and closeout."
---

# TaxKit Docs Maintainer

Keep the earliest durable semantic owner current in the same implementation
slice. This repository-local skill is complete without any global skill.

## Start and select the mode

1. Read `AGENTS.md`, then `docs/README.md`, the exact changed code/configuration
   and its direct README. Read `references/repository-profile.md` for the TaxKit
   owner map and real commands.
2. Inspect the worktree and the active SPEC/tasks or plan when present. Confirm
   every claim at the boundary that owns it: source, Schema, export map,
   generator, workflow, or dated external readback.
3. Choose one mode:
   - **Attached slice:** edit the owner and necessary pointers now.
   - **Audit/report-only:** for scheduled or background freshness, create a
     candidate with provenance, target revision, proposed owner, evidence,
     reviewer/publisher, recovery and non-claims. Do not edit or self-publish.

Do not infer release, registry, deployment, provider, or publication authority
from permission to edit repository documentation.

## Make an impact ledger before landing

For each material slice, record every applicable row as `Change required`,
`Preserve`, or `N/A`, with path evidence, semantic owner, acceptance/check and
explicit limitation. Cover:

- calculator rules/facts/schemas and their package/public/architecture owners;
- SDK export maps, types, examples, package README and packed-consumer proof;
- HTTP schemas, API docs and generated OpenAPI source/output/checks;
- public MDX, navigation, Fumadocs/docs-content runtime and page lifecycle;
- app/package structure and READMEs; architecture, standards and root routes;
- commands, CI, versioning/Changesets, release-readiness, runbooks and
  sanitized proof/history; and
- skills/mirrors, lint/config/tests, active SPEC/tasks and execution evidence.

`N/A` requires local evidence, not silence. Do not update every README by
habit, defer documentation to closeout, or copy implementation truth into this
skill. Update active intent whenever the change proves a requirement,
dependency, owner, gate, or acceptance claim wrong.

## Route the change to its owner

Use the profile's path map. In particular:

- Keep calculator and API/SDK contracts schema-derived, Effect boundaries flat
  and sequential, clients typed, and examples free of raw DTO/primitive-ID or
  generic SDK callback shortcuts.
- Edit generated documentation at its source, run the owning generator/check,
  and never hand-edit derived OpenAPI or Fumadocs output.
- For public pages, `draft` is only an authored local candidate. Mark a page
  `published` only with its exact accepted record and owner-policy binding;
  local rendering, prose intent and navigation do not establish availability.
- Keep runbooks as repeatable, authority-bound operations with preconditions,
  receipts, rollback and escalation. Keep raw logs, secrets and transient
  tarballs out of durable docs; retain only allowed sanitized proof.
- Use successor/tombstone links for replaced current docs. Historical and
  failed material retains provenance outside default current routes.
- `docs-writer` is a public-copy authoring aid only. It never owns maintenance,
  lifecycle, generated, package, runbook, proof, impact-ledger or validation
  work; invoke this skill first whenever those concerns are present.

## Verify and close the slice

Run the ledger's focused consumer proof first, then the applicable exact local
commands from the profile. For material documentation governance work run:

```bash
bun run test:skills
bun run check:docs
bun run check:repository-paths
bun run verification
git diff --check
```

Run docs validation/build/browser proof for MDX/runtime changes; OpenAPI/API
and SDK packed-consumer checks for their changed boundaries; and
`bun run release:check` only as local release-evidence proof. A local check
does not prove deployment, SSR/hydration, publication, registry state or
consumer behaviour.

Return changed owners, the complete ledger, commands and observable results,
artifact/authority where relevant, limitations/non-claims, and rollback or the
smallest unresolved owner decision. Stop if no current owner, generated source,
real check, lifecycle record, or required authority can be identified.
