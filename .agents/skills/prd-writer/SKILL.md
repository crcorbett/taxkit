---
name: prd-writer
description: Write or revise evidence-backed product requirements documents, technical SPECs, and implementation task lists against the current repository. Use when planning features, migrations, architecture changes, Effect/TypeScript services, React work, SDK integrations, or cross-cutting repository policy that must include exact code ownership, downstream docs and README impacts, lint and CI enforcement, repository skills, and executable acceptance criteria.
---

# PRD Writer

Write the smallest canonical SPEC and task set that lets an implementer proceed without inventing architecture.

## Establish repository truth

1. Open the named SPEC or locate the repository's canonical product-spec location.
2. Read applicable `AGENTS.md`, the working-tree status, spec/task authoring guides, architecture docs, all affected `README*` files, manifests, installed dependency versions, lint/test/CI configuration, and representative implementation paths.
3. Treat repository files and installed types as authoritative. Preserve unrelated work.
4. Use DeepWiki through Executor MCP only for upstream packages or libraries such as Effect, React, TanStack, or build tooling. Never use it to inspect the local codebase. Reconcile upstream advice with the installed version and local conventions.

Load context just in time. External systems remain authoritative for their live
state; repository docs own durable repository truth; the active SPEC/tasks own
only the current change. Link between layers instead of copying provider state,
architecture, procedures, proof, or task history into a second owner.

For a substantial repository, operational, automation, migration, or harness
SPEC, read the sibling
[`repository-harness-contract`](../docs-maintainer/references/repository-harness-contract.md).
Load its
[`contract map`](../docs-maintainer/references/harness/contract-map.md) and
[`invariant register`](../docs-maintainer/references/harness/invariant-register.md).
Apply the relevant stable invariant IDs without copying the references into the
SPEC.

When the SPEC starts from an audit, obtain the accepted finding register before
writing. Require the structured accepted-finding crosswalk and validate it with
the repository's audit validator when available. Preserve stable finding IDs.
Include accepted findings only; keep rejected, deferred, and optional findings
out of implementation scope unless the user explicitly accepts them later.

## Write the contract

Define goals, non-goals, current state, target ownership, call graphs, data and error contracts, security, accessibility, operations, rollout, rollback, and independently observable acceptance criteria as applicable. Replace phrases such as "follow existing patterns", "handle errors", or "add tests" with named owners, failure cases, files, and proof.

For a substantial SPEC, record a job contract containing:

- the accepted outcome and explicit non-goals;
- the semantic owner and affected paths;
- the authority envelope and stop conditions;
- a claim-to-proof mapping at the real boundary;
- the maintenance owner and expected carrying cost; and
- evidence that would weaken, revise, or retire the proposed intervention.

Add an applicability-driven harness contract for every material repository,
operational, automation, or cross-cutting change:

- identify truth layers, semantic owners, context routes, freshness, and what
  must remain a link rather than duplicated prose;
- separate skills (judgment and routing), runbooks (repeatable procedures with
  preconditions, authority, steps, evidence, rollback, and escalation),
  architecture, active tasks, proof, generated reference, and historical
  evidence;
- require bounded tool receipts that name the violated invariant, exact target,
  recovery hint, omitted-detail path, and observed postcondition;
- map every claim to an identifiable artifact, exact boundary or critical
  journey, evidence, limitations, non-claims, and release identity;
- record principal, identity source, operation, resource, environment,
  duration, approval, revocation, audit receipt, rollback, and escalation for
  consequential authority;
- promote repeated findings to the earliest durable schema, type, lint rule,
  test, generator, runbook, or canonical document and retire weaker reminders;
- admit continuous automation only for settled work with an observable signal,
  durable state, sufficient authority, convergence/idempotence, proof on every
  run, bounded failure, stopping, and escalation;
- name the worker/host/tool/runtime/skill evaluation epoch, accepted outcome,
  baseline, smallest intervention, disconfirming result, and the four distinct
  clocks: worker duration, feedback latency, synchronous human attention, and
  time to accepted outcome;
- maintain a small consumer-visible critical-journey inventory with a procedure
  owner and oracle against plausible imitation; and
- preserve failed, blocked, deferred, superseded, and inconclusive work with
  provenance and successor/tombstone outside the default context route.

Apply only the relevant lenses, but record `N/A` with evidence. Never use a
fixed pass count, file count, subagent count, or activity volume as proof.

For Effect work, require the locally supported APIs and these invariants:

- keep primary operations flat, lazy, composable, and sequential with `Effect.gen`, meaningful `Effect.fn`, or local equivalents;
- keep one-use mapping and error handling beside the operation; prohibit pass-through wrappers and helper sprawl;
- reuse owning Schemas, schema-derived types, branded identifiers, services, Layers, and tagged errors;
- decode unknown input once at the actual boundary and encode output at the outward boundary;
- use `Config`, `ConfigProvider`, and Schema-backed semantic configuration rather than manual primitive environment parsing;
- model expected failures in the typed error channel without `instanceof` policy branching;
- name retry, timeout, concurrency, interruption, telemetry, and resource-lifetime policy at the boundary that owns it.

For external SDK/client work, require the `effect-client-wrapper` acceptance contract: named operations only; no generic SDK `use` callback or exposed raw client; no raw `id: string`; no primitive configuration; no `instanceof`; and no unchecked SDK output. Require request encoding, immediate provider-result decoding, redacted configuration, typed Schema errors, and live plus mock/test Layers.

For React work, place data loading, Effect execution, and shared orchestration at the route or feature boundary. Give focused leaf components narrow readonly values and callbacks. Keep genuinely local UI state local. Reject giant routes, boolean-prop matrices, service-aware leaves, premature global components, and hooks that only rename one call.

## Record every impact

Add an impact ledger in the SPEC and task list. Mark each surface `Change required`, `Preserve`, or `N/A` with path evidence:

- canonical product, architecture, API, operational, migration, and index documentation;
- root, app, and package READMEs;
- lint, formatter, TypeScript, custom rules and fixtures, package scripts, and CI;
- repository-owned skills, `AGENTS.md`, skill metadata, references, scripts, and templates;
- manifests, configuration, Schemas, migrations, generators, fixtures, tests, observability, release, rollout, and rollback artifacts.

Load the sibling [`docs-maintainer`](../docs-maintainer/SKILL.md) during impact
design, then its repository-local profile when present. The SPEC's
documentation-impact contract names the semantic owner, lifecycle transition,
affected paths and pointers, generated source/action, exact repository checks,
proof location, and non-claims. Only the repository supplies commands, current
provider facts, archive policy, mirrors, and exceptions. Require owning docs
and necessary pointers to change in the same implementation slice, not as
final cleanup or a terminal catch-all documentation task.

For every required change, name the exact path or narrow path set, dependency order, acceptance criterion, and real repository command or inspection that proves it. Never invent command names.

## Create executable tasks

- Edit the SPEC and its canonical sibling task artifact in place as evidence changes the design.
- Keep tasks atomic, ordered, end-to-end, and traceable to SPEC requirements.
- Maintain a requirement-to-proof crosswalk for every material normative
  requirement. For each `must`, `required`, `never`, or accepted finding, name
  the owning task,
  direct observable, expected postcondition, plausible false green rejected,
  focused command or procedure owner, evidence owner, receipt path, and
  limitations. Broad suite coverage, successful construction, source layout,
  or a neighbouring assertion is proof by proxy, not a direct oracle.
- Expand compound policy into deterministic verification. Retry requirements
  separately name eligibility, bounded attempts, backoff, jitter, idempotent
  reads, uncertain writes, and observation after timeout when applicable.
  Isolation, substitution, and composition-root requirements directly assert
  the semantic result from every relevant root.
- Map every accepted audit finding to at least one owning requirement and task;
  record rejected, deferred, or optional findings as out of scope rather than
  silently dropping or implementing them.
- Carry the finding's invariant IDs, complete fixed impact-surface decisions,
  verification, journeys, and proof into its owning requirements and tasks.
- Put the relevant Effect, wrapper, helper-sprawl, React, documentation, lint, and skill acceptance rules inside every affected task rather than relying on one global reminder.
- Carry the applicable documentation-impact rows inside each owning task; do
  not delegate them to a separate end-of-project documentation task.
- Require targeted tests and the repository's actual formatting, lint, typecheck, build, runtime, browser, and skill-validation commands.
- Require implementation discoveries to update the SPEC, tasks, diagrams, docs, READMEs, and enforcement before the task can pass.
- Require each command/manual/provider/fresh-context check to name repository,
  cwd, invocation or procedure owner, expected postcondition, authority,
  applicability, receipt path, outcome, limitations, and non-claims. Raw logs
  alone are not completion proof.
- Remove or merge stale, duplicated, contradictory, and superseded tasks.
- Record unresolved product decisions as explicit blockers and decision tasks.

For ordinary repository improvements, require normal repository checks,
applicable real journeys, and one fresh independent review. Require a
fixed-worker comparative evaluation only when the SPEC makes a general claim
about the behavioral effect of a harness intervention.

When a SPEC explicitly requires a terminal audit, place it once in the final
closeout task after every implementation dependency. Any later implementation
invalidates that terminal status. The closeout task must reopen the owner of
each finding, refresh affected receipts and rollback identity, and run full
verification on the exact receipt-bearing state.

Finish by re-reading the SPEC and tasks together, checking links and diagrams, validating structured task files, and reporting the exact artifacts changed and remaining decisions.
