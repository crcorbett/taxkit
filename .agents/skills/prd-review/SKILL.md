---
name: prd-review
description: Re-review, edit, and strengthen this repository's product requirements, technical SPECs, and implementation tasks against actual code, docs, READMEs, lint rules, skills, configuration, tests, and commands. Use for implementation-readiness reviews, especially Effect and React architecture, helper-sprawl prevention, external-client boundaries, and downstream artifact coverage.
---

# Repository PRD Review

Use this repository-owned contract directly. Repository-local instructions,
installed types, and commands win over generic guidance. An available global
`prd-review` skill may add generic techniques, but this review never depends on
its filesystem path.

Always:

1. open the exact SPEC and associated tasks, inspect worktree state, and edit
   both in place unless the user explicitly requests findings only;
2. ground in `AGENTS.md`, owning architecture, affected `README*`, manifests,
   config, skills, and implementation; investigate unresolved decisions; then
   land by accounting for every repository-owned readable `docs/**` and
   `README*` before acceptance;
3. use one primary reviewer; delegate a bounded read-only evidence slice only
   when independent discovery, adversarial review, or a proved disjoint scope
   materially improves the evidence, then independently reconcile it;
4. use DeepWiki through Executor only for upstream packages/libraries such as
   Effect or TanStack—not to inspect this repository;
5. mark docs, READMEs, lint/static rules, skills, configuration, tests, release
   and operational artifacts `Change required` or `N/A` with exact paths and
   evidence; classify tests, fixtures, configuration, exports, manifests,
   lifecycle, release, rollback, critical journeys, and semantic owners as
   separate impact rows rather than hiding them in catch-all groups;
6. require `Context.Service`, explicit Layers, boundary-only codecs, flat
   sequential Effects, deterministic test Layers, the explicit route/container/
   leaf ownership contract below, and no helper sprawl where applicable;
7. make rewriting any stale `effect-client-wrapper` an acceptance task,
   including generic SDK callbacks, raw identifiers/client access, primitive
   config, runtime class policy, and unchecked provider output;
8. apply every supported finding to the SPEC/tasks and run the repository's real
   documentation, lint, typecheck, test, build, and skill checks that apply.

Route/feature boundaries or policy-owning containers own data loading,
fetch/query execution, Effect/service/RPC execution, remote/domain mutations
and commands, shared workflow/orchestration, and loading/error policy.
Presentation leaves receive narrow readonly values and callbacks. They own
rendering, accessibility, focus, and local UI interaction state only; they do
not load, fetch, or query boundary data, acquire services, run Effect or RPC,
execute remote/domain mutations or commands, or own shared workflow/error
policy.

Classify these as separate impact rows; do not collapse them into broader rows:
tests; fixtures; configuration; exports; manifests; lifecycle; release;
rollback; critical journeys; semantic owners.

Invoke `$docs-maintainer` while landing review findings. Require its complete
`Change required`/`Preserve`/`N/A` impact ledger and owner-specific proof;
do not let `$docs-writer` substitute for maintenance, lifecycle, generated,
package, runbook, proof, or validation work.

Report only edits made, evidence, commands, and genuine unresolved blockers.
