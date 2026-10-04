---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-implementation-owner
last_reviewed: 2026-10-04
review_trigger: local continuation, PR reconciliation, approval or dependency revision changes
---

# TaxKit local continuation prompt

Paste the following into the local thread with this repository selected.

## Task and authority

Continue the approved TaxKit clean-slate improvements tracked in Linear DEV-72
through DEV-81. Work only in `crcorbett/taxkit`. Cooper authorised implementation,
reviewable commits, pushes, draft PRs and routine Linear tracking. The cloud task
stopped at Cooper's explicit request to hand off locally; it did not complete the
whole rebuild. Do not treat this pause as cancellation or acceptance.

Read `AGENTS.md`, `docs/README.md`, the current Commonplace Linear skill at
`.agents/skills/linear/SKILL.md` and its applicable references, the strict Effect
skill, and the relevant package/architecture instructions before editing. Use
`docs/product-specs/clean-slate-foundation.md`, its sibling `.tasks.json`, and
`docs/exec-plans/active/clean-slate-foundation.md` as the current scope, dependency,
acceptance and execution owners. Read live Linear issues, linked design and
comments, PR state and hosted checks before resuming. Retain native dependency
relations and distinguish implemented, tested, reviewed, merged and deployed.

Q1–Q13 are settled. Cooper's current implementation request supersedes the old
whole-design Q14 hold. Do not ask for whole-design permission again. Verify
truly unresolved material choices. No merge, deployment, publication or provider
apply is authorised. Final provider-plan approval is a separate boundary.

## Checkout and review stack

Fetch remote branches and inspect local changes before switching. The latest
handoff branch is `codex/dev-73-skill-test-boundaries`; use its remote HEAD,
including this committed prompt. Review the stack instead of starting again
from main or cherry-picking only its final commit. All listed PRs were drafts,
unmerged and undeployed at handoff; refresh their live state.

| PR | Branch | Implementation revision |
| --- | --- | --- |
| [88](https://github.com/crcorbett/taxkit/pull/88) | `codex/dev-72-clean-slate-foundation` | `771a506a071277f1f975672c4edaa9e32bf629b0` |
| [89](https://github.com/crcorbett/taxkit/pull/89) | `codex/dev-73-stable-effect-qualification` | `59b0a36ff1bc6f95501734ee65d789a4f5a37fcc` |
| [90](https://github.com/crcorbett/taxkit/pull/90) | `codex/dev-73-canonical-skills` | `b726afb556fcafdb929b41417a8b0cf4a4aec92c` |
| [91](https://github.com/crcorbett/taxkit/pull/91) | `codex/dev-73-atom-and-enforcement` | `8549b92` |
| [92](https://github.com/crcorbett/taxkit/pull/92) | `codex/dev-73-strict-domain` | `e7b9f0a5a1da09fbc22825ce5916f0ba1d2aac7a` |
| [93](https://github.com/crcorbett/taxkit/pull/93) | `codex/dev-73-domain-boundaries` | `0b58ab548f1b76d46baf0e65fa5eaacc97f7cb69` |
| [94](https://github.com/crcorbett/taxkit/pull/94) | `codex/dev-73-owned-collections` | `c8affdc99f5eb155cec1af7793ef8cb8f2feb4cc` |
| [95](https://github.com/crcorbett/taxkit/pull/95) | `codex/dev-73-effect-tooling-tests` | `8a809208eb87d60575282290dfdd59a681fae676` |
| [96](https://github.com/crcorbett/taxkit/pull/96) | `codex/dev-73-api-test-boundaries` | `b854aad61e9e8cd07c061584cd2ccbae5e85fc8b` |
| [97](https://github.com/crcorbett/taxkit/pull/97) | `codex/dev-73-tool-runtime-boundaries` | `3217c6c856da1c599a013d4e3de12722d710000c` |
| [98](https://github.com/crcorbett/taxkit/pull/98) | `codex/dev-73-docs-adapter-boundaries` | `eb13b36c274b4da017acb170f4505a19caf9a156` |

The skill-policy migration follows #98 on the handoff branch. Its final PR and
revision are recorded in DEV-73 and Git history. PRs #88–98 had passed hosted
Quality at the cloud readback; #98 run was 37178311127. Recheck the latest branch
rather than attributing an earlier pass to a later commit.

## Completed scope and remaining goal

DEV-72 retained-work admission is In Review, with Cooper review outstanding.
DEV-73 remains In Progress. Stable dependency qualification, complete canonical
skill adoption, real Chromium Atom/Scheduler qualification, immutable core/rule
collections, domain/API serialization, shared testing, lint resource ownership,
repository-path/governance tooling, docs adapters and skill-policy test migration
are implemented in the stack. Current receipts under
`docs/documentation-audit/clean-slate-foundation/` state each slice's evidence
and non-claims. Do not mark all of DEV-73 complete based on these slices.

Finish DEV-73's full strict enforcement and host qualification, then implement
DEV-74–81 in the accepted dependency order through tested reviewable drafts.
They have not yet been implemented. Native relations at the previous readback:
72 → 73 → 74; 75 and 76 depend on 74; 77 depends on 75/76; 78 on 74/76;
79 on 75/76/77; 80 on 74/75/77; 81 on 78/79/80. Consult the actual task ledger
for the full acceptance criteria and reconcile overlap before moving a task.
Draft PRs are progress checkpoints, not completion of the overall goal.

Remaining T002 work includes SDK and release scripts, documentation/deployment/
quality/evaluation tooling, executable JavaScript lint policy, app/config and
infrastructure paths; exact host exceptions; disabled-rule/exception-broadening
negative tests; weak collections, Object/Reflect writes, runtime aliases and
readonly contract gaps; and semantic Schema/helper/state/lifetime review.
The old provisional inventory was 1,550 strict diagnostics before the docs and
skill-test slices. It included unqualified host/fixture cases, is not a confirmed
defect count, and must be regenerated through the actual installed CLI.

The SDK still has a package-global ManagedRuntime. T004 explicitly requires
caller-owned plain-client lifetime and disposal plus the Effect interface.
Reconcile that accepted design with T002 host enforcement; do not add broad
runtime exceptions or hide arbitrary execution behind generic callbacks.

## Tax correctness decision and companion repository

Protect retained rules, source artifacts, golden results and all three 2025–26
calculators. No Medicare correction was made. Cooper must resolve the bounded
scope decision recorded in
`docs/documentation-audit/clean-slate-foundation/2026-10-04-medicare-scope-conflict.json`
and DEV-73 comment `db7b8f4f-c061-4e79-b12a-4cecd54be0e1`.

Authoritative enacted source:
https://www.legislation.gov.au/C2026A00058/asmade/2026-06-30/text/original/epub/OEBPS/document_1/document_1.html
Act 58 of 2026 received assent 30 June 2026; Schedule 5 starts 1 July 2026 and
item 14 applies to 2025–26 and later assessments. For single non-SAPTO Medicare,
the nil threshold changed from $27,222 to $28,011 and the phase-in ceiling from
$34,027 to $35,013. The 10% phase-in and 2% full rate are unchanged.
A test-only parameter swap at $30,000 annual taxable income changed the levy
from $277.80 to $198.90 and total tax from $1,465.80 to $1,386.90. At $28,011 the
levy changed $78.90 to $0; at $35,013, $700.26 to $700.20 under retained cent
rounding. $20k/$50k/$80k samples were unchanged. Only the annual income-tax
calculator and its downstream representations are affected; PAYG withholding
and take-home pay use independent Schedule 1 rules. Do not widen to families,
SAPTO, surcharge or future-year support. Verify any newer decision in Linear
before acting. This decision blocks its correction only, not independent work.

The exact stable-v4, retained-output revision for companion adad qualification
is `59b0a36ff1bc6f95501734ee65d789a4f5a37fcc` (#89). It is not a claim of
current-law Medicare correctness or qualification of later SDK interface changes.
The coordinating parent can relay exact companion dependency revisions; adad is
not this task's write scope. The old local offline frozen-install failure is
distinct from already completed hosted recovery (#86/#87).

## Verification and environment

Use the repository-pinned toolchain and lockfile. The cloud used Bun 1.4.2,
Node 24.16.0, stable Effect 4.0.0, TypeScript 7.0.2 and @effect/tsgo 0.48.0.
Consult actual manifests/lockfile for the full graph. Cloud-only activation
`/workspace/.taxkit-cloud/activate.sh` and `/tmp/taxkit-csf-toolchain` are not
portable prerequisites; provision the equivalent pinned tools locally.
Canonical skill trees are pinned to Commonplace development-workflows 0.6.1,
commit `91a47d9fdde8aad214a0ab12742517cce344b709`. Do not modify the canonical
strict-policy asset to evade enforcement or silently refresh governance hashes.

Run each task's prescribed checks, including frozen install, format, lint,
actual CLI negative/positive fixtures, types, tests, build, full verification,
and relevant browser/packed/downstream checks. `bun run test` and
`bun run verification` cover different gates. Do not run lint/format/type scans
concurrently with tests that create temporary rejected source files. Do not edit
tracked files during release-boundary clone checks. Those tests can be silent
for about 90 seconds; full verification typically takes a few minutes. Build
sequentially before built-app browser tests to avoid output races.

The latest docs slice passed 75 lint cases and 13 docs-content tests, all tests,
full verification, build and local workerd/Chromium proof. The workerd receipt
harness was corrected to read installed manifests: @cloudflare/vite-plugin
1.62.5, workerd 1.20261001.1 and Wrangler 4.147.0. Older receipts hard-coded old
versions and do not establish the current dependency graph; retain them as
history. The processed-text SDK has no abort signal, so interrupting its awaiting
Effect does not prove provider cancellation. Local workerd is not hosted proof.

Review generated files through their actual owner rather than hand-editing them.
Fumadocs MDX 15.4.6 returns synchronous Vite plugins; Shiki 4.5 consumes the node
returned by its pre transformer. Keep provider methods attached to their
receiver. Oxlint has no stdin support; use scoped exact-path CLI fixtures.
`@effect/vitest` exposes `it.effect` (not `test.effect` on its test export).

## Handoff execution

Start by confirming the pushed branch, draft PR, recent CI and clean worktree;
then reconcile current Linear. Keep a concrete end-to-end plan through DEV-81,
post useful milestone/blocker/evidence comments and native project updates,
and continue safe independent work. Read back writes. Distinguish review,
implementation, merge and availability. Keep material unresolved decisions
visible without re-requesting already granted implementation authority.

No native goal-management tool or outbound cloud-thread messaging tool was
available in the cloud tool inventory. The goal is recorded in the active plan
and Linear; no background continuation or parent message delivery was claimed.
This prompt and the pushed repository state are the durable local handoff.
