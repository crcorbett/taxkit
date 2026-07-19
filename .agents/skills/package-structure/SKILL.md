---
name: package-structure
description: Route package scaffolding, audits, and migrations in this repository through its local workspace, namespace, source-condition, exception, forbidden-path, and verification profile plus the canonical global package-structure contract. Use whenever adding, changing, reviewing, or validating a package here.
---

# Repository Package Structure

Read [repository profile](references/repository-profile.md), then load
`/Users/cooper/.codex/skills/package-structure/SKILL.md` and follow it in full.

The local profile owns only repository facts. The global skill owns package
variants, Effect boundaries, templates, rendering, validation, and stale-pattern
rules. If the global skill or its named scripts are missing, stop with the exact
missing path; do not reconstruct the contract from memory.

Before editing:

1. read applicable `AGENTS.md`, every relevant `docs/**` and `README*`, root
   and package manifests, TypeScript/lint/test config, and representative
   packages;
2. inspect `git status --short` and preserve unrelated work;
3. decide package ownership and variant before creating files;
4. apply the profile's namespace, source condition, build/publish exception, and
   forbidden paths;
5. run the profile commands plus the global package validator.

Keep Effect programs flat and sequential, encode/decode only at boundaries,
keep test Layers deterministic and observable, and reject generic client escape
hatches, raw identifiers, primitive semantic config, unchecked outputs,
runtime class policy, and helper sprawl.
