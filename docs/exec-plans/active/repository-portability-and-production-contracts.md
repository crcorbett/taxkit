---
status: active
last_reviewed: 2026-07-18
source_of_truth: execution-plan
confidence: high
---

# Repository Portability and Production Contracts Execution Plan

Spec:
[Repository portability and production contracts](../../product-specs/repository-portability-and-production-contracts.md)

Task list:
[`repository-portability-and-production-contracts.tasks.json`](../../product-specs/repository-portability-and-production-contracts.tasks.json)

## Goal

Implement the task list one task at a time with exactly one sequential
subagent per task. The parent agent owns review, three-pass improvement audits,
independent verification and final acceptance before delegating the next task.
Return corrections to the same subagent; after a third failed correction turn
for one task, stop the rollout and record a blocker for replan or user
decision. Do not publish packages or run `version-repo`.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| RPC-001 | complete | Parent accepted correction turn 1 after focused, frozen-lockfile, repository-wide and root-test verification. |
| RPC-002 | pending | Audit-only string-contract taxonomy and decision ledger. |
| RPC-003 | pending | Portable Effect lint decision matrix and admitted rules. |
| RPC-004 | pending | Production-only Knip graph. |
| RPC-005 | blocked | Requires explicit user decisions for `STR-DEC-001` and `REL-DEC-001`. |
| RPC-006 | blocked | Requires accepted RPC-003/RPC-004, both RPC-005 decisions and an exact populated `resolvedScope`. |

## Decision Log

### STR-DEC-001 - unresolved

Choose whether the exported `IsoDate` Schema gains runtime calendar-date
validation, is replaced through a compatibility/deprecation path, or is
documented as constructor-validated only. No package-facing correction is
authorised before an explicit user decision.

### REL-DEC-001 - unresolved

Choose whether `@taxkit/calculators` joins the Changesets fixed group or remains
independently versioned. No release-policy change is authorised before an
explicit user decision.

## Validation Log

### 2026-07-18 - Rollout setup

- Read the target spec, task list, canonical implementation protocol and the
  architecture guidance for Effect services, package ownership, configuration,
  testing and abstraction admission.
- Confirmed the starting branch is `main` and the spec, task list and product
  spec index are the only pre-existing uncommitted rollout files.
- Corrected RPC-001's baseline scope to name all 11 files represented by the
  independently reproduced 39-reference checkout-path baseline.
- Confirmed RPC-001 through RPC-004 can proceed sequentially without deciding
  `STR-DEC-001` or `REL-DEC-001`; the rollout stops before RPC-005 unless both
  decisions receive explicit approval.

### 2026-07-18 - RPC-001 implementation candidate

- Replaced the 39 baseline file/line findings across the named 11 tracked files
  with repository-relative commands, repository identities and concise
  historical descriptions. An independent tracked-and-untracked readable-text
  audit returned zero and explicitly included the checker and both test files.
- Added the root-owned `tools/repository-paths` contracts, pure policy, Bun
  runtime and focused tests. The runtime inventories NUL-delimited
  `git ls-files` output through `ChildProcessSpawner`, reads files and tracked
  symlink values through Effect FileSystem, applies strict UTF-8/NUL binary
  classification with bounded concurrency and emits stable schema-backed
  findings without matched text, usernames, stderr or surrounding content.
- Added `check:repository-paths`, `check:repository-paths:types` and
  `test:repository-paths`; root verification runs the first two and root test
  runs the focused suite. Knip owns the exact root entry/project inventory and
  Oxlint owns the exact decoder/runtime entrypoint allowlists.
- Focused evidence passed: `bun run test:repository-paths` (11 tests),
  `bun run check:repository-paths:types` and `bun run
  check:repository-paths` (507 text, 8 binary and 515 tracked files).
- Repository evidence passed: `bun run verification`, `git diff --check`, JSON
  parsing for every changed task list/config file and `bun run changeset status
  --verbose`.
- No Changeset is required: this slice changes a root-internal validation tool,
  repository configuration and documentation, not a versioned package-facing
  contract. `@taxkit/scripts` remains unchanged.

RPC-001 improvement audits:

1. Matching and fixture audit: kept HTTPS references, repository-relative
   paths, repository identities, ordinary prose and tilde-dot tool state valid;
   added all five rejected categories, deterministic precedence, CRLF line
   reporting, malformed UTF-8/NUL proof and runtime-assembled private-looking
   fixtures. The runtime reads tracked symlink values instead of following
   workstation targets.
2. Effect and ownership audit: retained one linear `Effect.gen` primary
   program, canonical Schema-derived findings and tagged errors, one
   `BunServices.layer` provision and one runtime `runMain`; removed unused
   helper/type exports found by Knip. No unsafe casts, DTO mirrors, manual
   object readers, broad services/layers or raw process error rendering remain.
3. Artifact audit: checked every baseline replacement for preserved meaning,
   added exact root/Knip/Oxlint wiring and aligned README, package ownership,
   testing and tooling guidance. No browser/runtime package gained a server-only
   import.

### 2026-07-18 - RPC-001 parent audit correction turn 1

- Parent review found that root `package.json` declared
  `@effect/platform-bun` and `@types/bun` while the root workspace manifest in
  `bun.lock` still omitted both entries. Re-ran the repository's normal `bun
  install` flow and confirmed the lockfile now records both root development
  dependencies. The same lock reconciliation aligned stale workspace version
  records from `0.1.0` to the already-current `1.0.0` package manifests; it did
  not edit package manifests or run `version-repo`.
- `bun install --frozen-lockfile` now passes, proving package and lockfile state
  agree.
- Re-ran `bun run test:repository-paths` (11 tests), `bun run
  check:repository-paths:types`, `bun run check:repository-paths`, `bun run
  verification`, `bun run changeset status --verbose`, JSON parsing and `git
  diff --check`; all passed and Changesets still reports no package release.
- Reconfirmed this correction changes only `bun.lock` plus this execution-plan
  evidence. Concurrent `.agents/skills/**` changes remain outside RPC-001 and
  untouched. The no-Changeset decision remains correct because the root tool,
  root dependency declarations, lockfile and documentation are not a versioned
  package-facing contract.

### 2026-07-18 - RPC-001 parent acceptance

- Parent review accepted the closed five-category policy, portable-path
  exceptions, Schema-derived findings, tagged failures, tracked-symlink
  handling, strict text/binary classification, bounded Effect platform flow
  and stable safe reporting. No unsafe cast, DTO mirror, repeated decoding,
  generic scanner abstraction, service/layer sprawl or browser import was
  introduced.
- The parent independently ran `bun install --frozen-lockfile`, the focused
  test/type/runtime commands, `bun run verification`, `bun run test`,
  Changeset status, JSON validation, `git diff --check` and a tracked-plus-new
  readable-text audit. All final commands passed; the expanded audit found zero
  checkout-path references and included the new tool, spec and plan files.
- One first root-test attempt completed the new path tests and API assertions
  but an API test worker then hit a transient allocator `SIGABRT`. The exact
  root test retry passed all 18 Turbo tasks. The same transient class affected
  one earlier Knip attempt; standalone and complete verification retries passed.
- The parent confirmed root `test` executes the focused path suite and root
  `verification` executes the tool typecheck and live zero-findings scan, so the
  existing CI workflow enforces both contracts without workflow changes.
- RPC-001 is accepted with the documented no-Changeset rationale. The final
  call graph remains the spec graph, and RPC-002 may now begin.

## Call-Graph Status

The target call graphs in the spec are the acceptance baseline. RPC-001 still
matches its target graph: tracked source and documentation flow through the
root repository-path command into a tracked-text inventory, schema-backed safe
findings and the zero-findings verification gate. The implementation adds only
the required tracked-symlink representation read inside that inventory step;
it does not introduce another owner or execution layer. Later tasks record
their graph result before parent acceptance.

## Changeset Policy

Repository-internal tools and documentation record an explicit no-Changeset
rationale. Every package-facing correction receives a package-owned Changeset,
including changes to private versioned packages. This rollout does not apply
pending versions or publish packages.
