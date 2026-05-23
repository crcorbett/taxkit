---
status: draft
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Documentation Improvement Roadmap

## Overview

WhatTax now has the first layer of Mobius-style documentation structure:
architecture docs, product specs, exec-plan buckets, design docs, references,
agent routing, PRD skills and a documentation audit.

The next documentation pass should make that structure more useful for actual
development. The goal is to turn the current docs from a baseline map into a
working development guide that clearly separates current implementation,
planned architecture and next build steps.

## Problem

The repo is still early. It has a working standalone API app, web scaffold,
health-only Effect HTTP API package, core engine package and first Australian
rule packages, while public calculation HTTP endpoints, SDK and docs app remain
planned. That creates a documentation risk: planned package families can read
like current code, and developers or agents can lose time following
aspirational paths.

The current documentation audit already identifies the first gaps:

- package README coverage must stay aligned as new package roots gain
  manifests, source exports and verification
- root `README.md` is still a minimal landing page rather than a useful
  human-facing repo overview
- the architecture docs describe future packages that are not yet present
- no active exec-plan examples exist
- the standalone repo status HTML page exists but is not yet documented as a
  generated or snapshot artifact

## Goals

- Make it immediately obvious what exists today versus what is planned.
- Add README coverage for existing package roots.
- Upgrade the root README into a concise human entrypoint that routes to the
  atlas, architecture, specs, package docs and status snapshot.
- Give the repo status HTML snapshot an explicit owner and refresh workflow.
- Add a small docs-maintenance convention so future package or architecture
  changes update the right docs.
- Keep public WhatTax docs focused on the open-source tax engine, API, SDK and
  documentation site.

## Non-goals

- Implement additional tax engine packages.
- Scaffold `apps/api`, `apps/docs` or `@whattax/sdk-typescript`.
- Create a full documentation website.
- Replace architecture docs with a generated status page.
- Add private downstream product strategy to public WhatTax docs.

## Ownership And Boundaries

- `README.md` owns the human-facing repo overview and quick-start.
- `AGENTS.md` owns agent routing and task-type routing.
- `docs/architecture/*` owns durable package boundaries, runtime shape and
  invariants.
- `docs/product-specs/*` owns current implementation intent.
- `docs/exec-plans/*` owns live progress and validation evidence once work
  begins.
- package root `README.md` files own package-local scope, public surface,
  runtime shape, commands and guardrails.
- `docs/repo-status-outline.html` is a manually refreshed status snapshot, not
  a canonical source of truth.

## Proposed Approach

1. Add package READMEs for `packages/http-api` and `packages/tsconfig` using the
   compact pattern: scope, main areas, runtime shape, guardrails and related
   docs.
2. Refresh `README.md` so a new contributor can understand current repo state,
   available commands, implemented surfaces and documentation entrypoints.
3. Add a docs-maintenance section to the documentation audit or a new design doc
   that says when to update root docs, package READMEs, architecture docs,
   specs, exec plans and the HTML status snapshot.
4. Update the architecture index and package-ownership docs to more explicitly
   mark planned package families as planned, not implemented.
5. Decide whether `docs/repo-status-outline.html` should remain a checked-in
   manual snapshot or move under a future generated-docs convention. Until that
   exists, document it as a snapshot and link it from `README.md`.
6. Add an active exec-plan template or example only if implementation begins;
   otherwise keep `docs/exec-plans/active/README.md` as the empty landing page.

## Risks And Tradeoffs

- Over-documenting a small repo could make the docs feel heavier than the code.
  Keep each README compact and route deeper only when needed.
- If planned package docs become too concrete, they can mislead agents into
  assuming packages exist. Planned package docs must say "planned" clearly.
- A static HTML status snapshot can drift. It should be labelled as a snapshot
  and refreshed only when it helps humans review current state.
- Documentation maintenance rules can become busywork. They should be tied to
  meaningful ownership changes, new package roots, new runtime boundaries and
  new public surfaces.

## Acceptance Criteria

- `packages/http-api/README.md` exists and documents the current health API,
  export paths, server/browser boundary and commands.
- `packages/tsconfig/README.md` exists and documents the shared TypeScript
  config package.
- `README.md` explains current implemented surfaces, quick commands, docs
  entrypoints and where to view the status snapshot.
- Planned package roots are clearly labelled as planned in docs that mention
  them.
- `docs/repo-status-outline.html` is linked or documented as a status snapshot
  with a clear refresh expectation.
- The documentation audit is updated to reflect README coverage changes and any
  remaining gaps.
- `bun run verification` passes after the documentation changes.

## References

- [Documentation audit](../documentation-audit/README.md)
- [Architecture overview](../architecture/README.md)
- [Package ownership](../architecture/package-ownership.md)
- [Agent-first documentation](../design-docs/agent-first-documentation.md)
- [Writing specs](./writing-specs.md)
- [Writing spec task lists](./writing-task-lists.md)
