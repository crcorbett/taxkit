---
name: prd-review
description: Re-review, edit, and strengthen this repository's product requirements, technical SPECs, and implementation tasks against actual code, docs, READMEs, lint rules, skills, configuration, tests, and commands. Use for implementation-readiness reviews, especially Effect and React architecture, helper-sprawl prevention, external-client boundaries, and downstream artifact coverage.
---

# Repository PRD Review

Load `/Users/cooper/.codex/skills/prd-review/SKILL.md` and follow it in full.
Repository-local instructions and commands win over generic examples. Stop if
the global skill is missing; do not recreate it from memory.

Always:

1. open the exact SPEC and associated tasks, inspect worktree state, and edit
   both in place unless the user explicitly requests findings only;
2. read applicable `AGENTS.md`, every repository-owned readable `docs/**` and
   `README*`, manifests, lock/runtime config, lint/format/test/CI config,
   repository skills and metadata, and representative implementation files;
3. delegate at least one bounded read-only evidence slice to a subagent when
   available, then independently verify and reconcile it;
4. use DeepWiki through Executor only for upstream packages/libraries such as
   Effect or TanStack—not to inspect this repository;
5. mark docs, READMEs, lint/static rules, skills, configuration, tests, release
   and operational artifacts `Change required` or `N/A` with exact paths and
   evidence;
6. require `Context.Service`, explicit Layers, boundary-only codecs, flat
   sequential Effects, deterministic test Layers, narrow leaf ownership, and no
   helper sprawl where applicable;
7. make rewriting any stale `effect-client-wrapper` an acceptance task,
   including generic SDK callbacks, raw identifiers/client access, primitive
   config, runtime class policy, and unchecked provider output;
8. apply every supported finding to the SPEC/tasks and run the repository's real
   documentation, lint, typecheck, test, build, and skill checks that apply.

Report only edits made, evidence, commands, and genuine unresolved blockers.
