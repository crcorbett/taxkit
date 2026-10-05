---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-harness-owner
last_reviewed: 2026-07-24
review_trigger: accepted HE finding, canonical skill baseline, harness profile, governance validator, verification graph, or harness epoch change
successor: null
tombstone: false
---

# Harness foundation improvements

## Overview

TaxKit completed the smallest coherent harness-foundation migration needed to
requalify its repository-governance claims. The implemented migration completes
the portable canonical skill baseline, makes the embedded harness contract
self-contained, instantiates the TaxKit repository profile and structured
audit records, enforces them through one deterministic repository gate, and
qualifies a new target-specific epoch.

Implementation completed on 24 July 2026. The historical execution plan is
[`harness-foundation-improvements.md`](../exec-plans/completed/harness-foundation-improvements.md).

Target inspected for this proposal:

- repository revision:
  `8695c018accf4c4abb7e803c631c5120f90e52b2`;
- branch/upstream: clean `main` at `origin/main`;
- implementation authority: repository-local reads, writes, verification, and
  passing-gated task commits; and
- explicit stops: push, versioning, release,
  publication, deployment, provider access, website/public-content work, and
  evidence deletion.

## Verified findings and structured-audit limitation

The supplied HE findings were independently rechecked against the target
revision and accepted as the planning input for this SPEC. `HFI-001`
instantiated the structured owners under
`docs/documentation-audit/harness-foundation/`; their Schema validation and
mapping checks now gate every dependent correction.

| Finding | Verified evidence at the target | Invariants | Requirements | Tasks |
| --- | --- | --- | --- | --- |
| `HE-001` | `docs/verification/harness-epochs.md` binds HGI-206 to target `a8a58882...`, skill digests and a 22 July epoch, and requires requalification after a skill change. Commits `57f13c1`, `623115e`, and `8695c01` changed repository skills on 24 July. `docs/exec-plans/active/README.md` still records no active plan, and no successor harness SPEC/task, epoch, or requalification exists. | `HC-EPOCH-001`, `HC-PROOF-001`, `HC-EVIDENCE-001` | `HFR-001`, `HFR-006` | `HFI-001`, `HFI-004`, `HFI-005` |
| `HE-002` | `.agents/skills/docs-maintainer/references/harness/contract-map.md` requires `document-classes.md` and `change-impact.md`. Neither file exists in the repository-local skill, while the skill claims it is self-contained. | `HC-DOC-001`, `HC-TOOL-001`, `HC-REPO-001` | `HFR-003` | `HFI-002`, `HFI-005` |
| `HE-003` | Harness JSON Schemas and a repository-profile template exist under `.agents/skills/docs-maintainer/assets/harness/`, but there is no TaxKit profile instance, structured audit scope/findings/acceptance template set, accepted HE register, repository audit/profile validator, or focused gate in root `verification`. | `HC-REPO-001`, `HC-TOOL-001`, `HC-FEEDBACK-001` | `HFR-001`, `HFR-004` | `HFI-001`, `HFI-003`, `HFI-005` |
| `HE-004` | The current `repo-structure` baseline defines six complete canonical skill folders, repository overlays for the docs-maintainer and package-structure profiles, content-addressed tree receipts, and relative Claude links for all six. TaxKit has the six folder names, but several folders are partial, there is no canonical tree receipt, and the standard links for `effect-client-wrapper`, `package-structure`, and `prd-review` are absent. | `HC-REPO-001`, `HC-DEPENDENCY-001`, `HC-DOC-001` | `HFR-002`, `HFR-003`, `HFR-005` | `HFI-002`, `HFI-003`, `HFI-005` |

The implementation audit records must retain the exact `HE-001` through
`HE-004` IDs. The local audit Schemas must accept those stable IDs rather than
renumbering them to a generic `FINDING-*` sequence.

## Problem

TaxKit currently has three disconnected governance layers:

```ts
Current harness path

maintainer request
  -> repository-local PRD skill
    -> embedded docs-maintainer contract
      -> missing document-class and change-impact references
      -> uninstantiated harness Schemas/profile template
    -> prose-only HE handoff
      -> no structured register or accepted-finding crosswalk
    -> root verification
      -> skill policy checks only
      -> no profile, audit, receipt, or canonical-tree validation
```

```ts
Current skill distribution

installed canonical skill collection
  -> manual TaxKit skill copies/adaptations
    -> incomplete folder trees
    -> TaxKit profiles mixed with copied skill content
    -> no content-addressed baseline receipt
    -> partial .claude/skills links
```

The result is a false continuation risk. A worker can retrieve the new harness
language while the repository cannot prove that the contract is complete,
which variation belongs to TaxKit, which audit findings were accepted, or
whether the local skills still match the intended canonical source. HGI-206
cannot cover that changed state because its own epoch owner says skill changes
invalidate qualification.

## Goals

- Preserve `HE-001` through `HE-004` in schema-valid audit and acceptance
  records and map every accepted finding to requirements and tasks.
- Instantiate one TaxKit repository harness profile from the fixed profile
  contract.
- Adopt the complete six-skill canonical baseline with only the two declared
  TaxKit repository-profile overlays.
- Retain `docs-writer` as an explicitly owned TaxKit public-copy-only extra.
- Preserve the existing `portless` skill as an unchanged local developer-tool
  extra outside the canonical harness baseline.
- Record content-addressed skill-tree identities and exact relative Claude
  links without requiring an installed global path at runtime.
- Restore the missing docs-maintainer reference contract and make every
  repository-local skill usable from a clean clone.
- Add structured audit templates, Schemas, actual HE audit records, and one
  deterministic Effect-native validator.
- Run the focused validator in normal `bun run verification`; hosted CI inherits
  it through the existing `bun run release:check -- --ci` graph.
- Qualify a new epoch only after the final skill/governance state and the five
  retained TaxKit journeys pass.

## Non-goals

- Re-rendering TaxKit from the `repo-structure` scaffold or copying the full
  generated Site-style repository layout.
- Changing calculators, rules, API/SDK contracts, package exports, app runtime,
  React composition, provider clients, or storage boundaries.
- Editing `apps/docs/content/**`, docs navigation, website design, public copy,
  or public-content lifecycle records.
- Replacing, reopening, or weakening HGI-203 release proof, HGI-204 runbooks,
  HGI-205 workflow/controls, or the operational authority model.
- Changing the fixed nine-artifact package release train or the nine-step local
  release-readiness graph.
- Creating a comparative harness campaign or claiming general causal
  effectiveness. One new TaxKit epoch remains target-specific.
- Committing, pushing, versioning, tagging, releasing, publishing, deploying,
  accessing a provider, or performing recovery under this drafting authority.

## Requirements

### `HFR-001` — structured audit acceptance and TaxKit profile

Create repository-owned audit scope, findings, and accepted-finding Schemas and
templates, plus actual records for this migration under
`docs/documentation-audit/harness-foundation/`. The accepted crosswalk must map
each `HE-*` ID to at least one requirement and task in this SPEC.

Instantiate `docs/verification/repository-harness-profile.json` with:

- TaxKit purpose and Git identity source;
- current docs, architecture, standards, README, generated-reference,
  runbook, proof, evidence, SPEC, plan, archive, skill, and agent owners;
- exact focused and closeout commands;
- the five current critical journeys and representative jobs;
- release, provider, public-site, trust, and rollback boundaries;
- corpus exclusions and non-claims; and
- only evidenced qualified exceptions.

The profile is the sole repository variation surface. It cannot redefine
invariants, finding decisions, truth precedence, authority, proof identity, or
failed-work retention.

### `HFR-002` — complete canonical skill baseline

The canonical baseline is exactly:

1. `docs-maintainer`;
2. `effect-client-wrapper`;
3. `package-structure`;
4. `prd-implementer`;
5. `prd-review`; and
6. `prd-writer`.

Each `.agents/skills/<name>/` folder must be a complete copy of one recorded
canonical source tree. TaxKit may differ only at:

- `docs/skill-profiles/docs-maintainer.md`; and
- `docs/skill-profiles/package-structure.md`.

Record a deterministic receipt at
`tools/skills/canonical-skill-baseline.json`. It must contain the canonical
source identity available at implementation time, per-tree entry counts and
SHA-256 tree digests, the two allowed overlays, the standard relative Claude
links, limitations, non-claims, and refresh trigger. No runtime validator may
read a user home directory or depend on a global skill installation.

The receipt must separately declare local extras:

- `docs-writer`: owned by `taxkit-documentation-owner`, public-copy wording
  only after `docs-maintainer` selects the semantic owner; never a maintenance,
  lifecycle, generated-content, package, runbook, proof, or validation owner;
- `portless`: preserved unchanged as the existing local development-tool skill
  and excluded from canonical harness-baseline claims.

### `HFR-003` — self-contained portable local skills

Repair the missing docs-maintainer reference routes, including the document
class, change-impact, and proof/authority/lifecycle material required by the
canonical tree. Validate every Markdown link and bundled
`agents/openai.yaml`, `references/**`, `assets/**`, and `scripts/**` member.

All standard Claude links must be relative symlinks to the local canonical
folders:

```text
development-workflows:docs-maintainer
development-workflows:effect-client-wrapper
development-workflows:package-structure
development-workflows:prd-implementer
development-workflows:prd-review
development-workflows:prd-writer
```

Preserve the existing relative `docs-writer` and `portless` links. Do not
create copied Claude mirrors.

### `HFR-004` — executable governance gate

Add a focused, deterministic, Effect-native tool under `tools/governance/`
that decodes unknown JSON once at filesystem ingress and validates:

- the TaxKit profile against the fixed profile contract;
- structured audit scope, findings, accepted decisions, and the HE
  requirement/task crosswalk;
- complete impact-surface decisions and stable invariant/finding IDs;
- accepted-only implementation eligibility;
- exact canonical skill tree digests and permitted profile overlays;
- complete relative Claude links;
- local skill references and absence of user-specific runtime dependencies;
- critical-journey owners and required non-claims; and
- receipt limitations, review triggers, recovery, and retirement fields.

Expose focused type, test, and runtime commands, including rejection fixtures
for missing HE mappings, a partial skill tree, a changed unreceipted skill,
an unexpected overlay, a copied or absolute Claude link, a missing reference,
an invalid profile, and a false external-state claim.

Add the target `package.json` script `check:harness-governance` to the existing
`verification` script.
Do not add a second CI workflow step: `.github/workflows/quality.yml` continues
to invoke the canonical release graph, which begins with root verification.

### `HFR-005` — ownership and public-copy separation

Update the earliest durable maintainers only:

- `docs/README.md`;
- `docs/verification/harness-epochs.md`;
- `docs/verification/effectiveness.md`;
- `docs/architecture/testing-and-quality.md`;
- `docs/standards/tooling.md`;
- `docs/documentation-audit/README.md`; and
- the repository-local skill/profile owners and root command route.

Do not edit public MDX, docs-site navigation, public-copy templates, package or
app READMEs, or website/runtime owners. The `docs-writer` skill participates
only as a preserved ownership decision; it is not invoked to author this
maintenance change.

### `HFR-006` — post-migration epoch requalification

Do not update the current epoch claim until `HFI-001` through `HFI-003` pass
against one immutable candidate. Requalification must bind:

- exact target commit/tree and changed-path identity;
- worker/model, host, tools, runtime, final local skill-tree digests, profile,
  validator, scenario, authority, and context projection;
- the five retained journey owners from
  `docs/verification/critical-journeys.json`;
- calculator, packed SDK, HTTP API, docs runtime, and report-only release
  readiness receipts;
- four separately measured clocks or explicit `null` reasons;
- one fresh independent review against the immutable candidate;
- limitations, non-claims, rollback/recovery, and retained failed or
  inconclusive attempts.

The new epoch may qualify only repository-local behavior for that target. Keep
local source consistency, Git identity, hosted CI, package registry,
deployment/provider state, public-site actuality, and external consumer
behavior as separate claims. Do not overwrite HGI-206 evidence; route it as the
previous target-specific epoch.

## Target call graphs

```ts
Governance: target

accepted HE finding input
  -> structured scope and finding register
    -> accepted-finding crosswalk
      -> HFR requirement and HFI task
        -> TaxKit harness profile
        -> canonical skill baseline plus declared overlays/extras
        -> content-addressed skill receipt and relative Claude links
          -> Effect-native harness-governance validator
            -> bun run verification
              -> existing release:check -- --ci
                -> existing Quality workflow
```

```ts
Requalification: target

immutable migrated candidate
  -> focused profile/audit/skill validation
  -> bun run verification
  -> five retained TaxKit journeys
  -> bounded target-specific receipts
  -> fresh independent review
  -> new harness epoch and effectiveness decision
  -> lifecycle closeout
```

```ts
Tests: target

accepted and adversarial governance fixtures
  -> filesystem ingress
  -> owning Effect Schemas
  -> flat policy inspection
  -> tagged findings with target and recovery
  -> bounded runtime receipt
```

## Implementation sequence

1. `HFI-001` creates the structured audit/profile foundation and converts this
   prose planning crosswalk into schema-valid records.
2. `HFI-002` migrates the six complete canonical skill trees, repairs missing
   references, records overlays/extras and receipts, and completes relative
   Claude links.
3. `HFI-003` enforces the final profile, audit, skill, receipt, link, and
   portability state through the focused command, root verification, and
   inherited CI graph.
4. `HFI-004` freezes the migrated candidate, runs the five retained journeys,
   records a new epoch, and obtains fresh independent review.
5. `HFI-005` reconciles lifecycle owners and closes the SPEC/tasks/plan only
   after the new epoch is accepted.

`HFI-001` through `HFI-003` are complete. Independent review supplied a narrow
fail-closed profile-policy correction before HFI-003 acceptance was restored.
The repository-local gate validates the exact HE crosswalk, TaxKit profile,
content-addressed skill
baseline, two profile overlays, two declared extras, eight relative Claude
links, self-contained references, five journey owners, and external
non-claims. `HFI-004` must freeze the resulting committed candidate before any
successor epoch claim. The first post-commit path check invalidated the initial
candidate because two adversarial tests embedded private-looking absolute path
literals; HFI-003 remains complete only after the equivalent fixtures are built
from neutral fragments and the tracked path/full gates pass.
Independent review of the next candidate then proved that full host permission
bits were not portable through Git: non-executable `0600` source templates
materialized as `0644` in a clean clone. The canonical content boundary remains
unchanged, but TaxKit's enforceable receipt must normalize regular-file modes
to Git's portable `0644`/`0755` distinction and pass both checkout contexts.
Adversarial review of the corrected candidate then proved that this distinction
is specifically Git's owner-execute bit: mode `0654` stages as non-executable,
while `0744` stages as executable. That candidate is also rejected; the
normalizer and focused proof must encode those two cases before a successor is
frozen.
The next candidate passed every gate, journey and fresh independent review, but
HFI-005 then proved its canonical profile still named the specific active
SPEC/plan and an active-migration lifecycle. Moving the plan would stale that
profile; correcting the profile triggers requalification. That acceptance is
therefore retained but invalidated, and the stable-index profile must be part of
the successor target. Fresh review of that successor then found that the epoch
verifier still classified the required `harness-epochs.md` and
`effectiveness.md` lifecycle-owner corrections as preserved surfaces. After
that post-candidate evaluator correction, the same review proved normal
governance still accepted the exact volatile profile lifecycle/owner shape.
Candidate `f12c324` is retained as rejected; the corrected HFI-003 gate enforces
the stable lifecycle and index owners before another successor target is
frozen.

The exact task contract and dependencies live in
[`harness-foundation-improvements.tasks.json`](./harness-foundation-improvements.tasks.json).

## Documentation and downstream impact ledger

`$docs-maintainer` owns this impact decision. `N/A` rows state the inspected
owner that remains unchanged; silence is not an impact decision.

| Surface | Decision | Evidence and required paths | Acceptance and verification |
| --- | --- | --- | --- |
| SPEC | Change required | This implemented owner: `docs/product-specs/harness-foundation-improvements.md`. | Requirements, HE mapping, boundaries, non-claims, ledger, and final lifecycle agree. |
| Sibling tasks | Change required | `docs/product-specs/harness-foundation-improvements.tasks.json`. | Exact dependencies, outputs, task-local ledger coverage, verification, independent review, rollback, and commit policy validate as JSON. |
| Product-spec index | Change required | `docs/product-specs/index.md`. | Lists this SPEC as Implemented with the accepted epoch and no active-work claim. |
| Execution plan | Change required | `docs/exec-plans/completed/harness-foundation-improvements.md` and the active/completed indexes. | Completed evidence is historical, and the active index contains no plan residue. |
| Semantic owners | Change required during implementation | `docs/README.md`, `docs/verification/harness-epochs.md`, `docs/verification/effectiveness.md`, `docs/architecture/testing-and-quality.md`, `docs/standards/tooling.md`, and `docs/documentation-audit/README.md`. | Owners route the profile, structured audit, focused gate, previous epoch, current epoch, limitations, and non-claims without copying procedures. |
| Documentation audit records | Change required | `docs/documentation-audit/templates/**` and `docs/documentation-audit/harness-foundation/**`. | Scope, HE findings, decisions, crosswalk, receipts, failures, independent review, and closeout decode and remain addressable. |
| Root README | Change required | `README.md` routes the focused harness-governance command and root verification edge. | The command/purpose/non-claim route is present; no public-site copy changed. |
| App/package READMEs | N/A | `apps/**/README.md` and `packages/**/README.md` own unchanged runtime/package contracts; journey commands are consumed, not changed. | Focused diff confirms no app/package README or package contract changed. |
| Public MDX/navigation | N/A | `apps/docs/content/**`, `apps/docs/navigation.json`, and `tools/documentation/owner-policy.json` are public-content owners outside scope. | No public content/status/navigation path changes; no `docs-writer` copy pass. |
| Canonical skill folders | Change required | Complete `.agents/skills/{docs-maintainer,effect-client-wrapper,package-structure,prd-implementer,prd-review,prd-writer}/**`. | Exact tree receipt passes with only the two declared profile overlays. |
| `docs-writer` extra | Change required for receipt/policy evidence; content preserved unless canonical ownership text is inconsistent | `.agents/skills/docs-writer/**`, `docs/README.md`, and skill-policy fixtures. | Receipt declares the TaxKit owner and public-copy-only boundary; no maintenance authority is added. |
| `portless` extra | N/A — preserve | `.agents/skills/portless/**` and `.claude/skills/portless` support existing local development and are outside the canonical harness baseline. | No content/link change except receipt classification if the validator requires all extras to be declared. |
| Agent instructions | N/A — preserve | `AGENTS.md` already routes material skill/SPEC changes through docs-maintainer; `CLAUDE.md` points to it. | No new atlas or duplicated harness procedure. |
| Claude skill links | Change required | `.claude/skills/**`; three standard baseline links are absent at the target. | All six standard links are exact relative symlinks; docs-writer/portless links remain relative; copied mirrors fail. |
| Bundled skill references/assets/scripts | Change required | Canonical skill tree members, especially docs-maintainer references and package-structure assets/scripts. | Complete-tree digest, link resolution, skill structural validation, and clean-clone use pass without global filesystem access. |
| Skill metadata | Change required | Canonical `agents/openai.yaml` within all six baseline skills; TaxKit extras retain their owned metadata. | Metadata exists, matches the skill name, and is included in tree digests. |
| Harness profile | Change required | `docs/verification/repository-harness-profile.json` and `tools/governance/schemas/harness/**`. | Profile decodes, names TaxKit owners/commands/journeys/non-claims, and contains no unevidenced exception. |
| Audit Schemas/templates | Change required | `tools/governance/schemas/audit/**` and `docs/documentation-audit/templates/**`. | Stable `HE-*` IDs, complete surfaces, decisions, target identity, and accepted crosswalk are enforced. |
| Governance tool source | Change required | `tools/governance/{schemas.ts,policy.ts,check.runtime.ts,tsconfig.json}`. | Flat Effect program decodes once at ingress, emits bounded tagged findings, and performs no mutation. |
| Tests | Change required | `tools/governance/**/*.test.ts` and `tools/skills/skill-policies.test.ts`. | Focused profile/audit/tree/link/reference tests and existing skill-policy tests pass. |
| Fixtures | Change required | `tools/governance/fixtures/**` and affected `tools/skills/fixtures/**`. | Accepted fixtures pass; partial tree, stale digest, missing HE mapping/reference, invalid link/profile and false-claim fixtures fail for the expected invariant. |
| Configuration | Change required | `tools/governance/tsconfig.json`, `oxlint.config.ts`, exact boundary allowlists needed by the new runtime, and `oxfmt.config.ts` excluding the content-addressed `.agents/skills/**` projection. | Typecheck, lint, and format checks pass without rewriting canonical skill identity, broad lint exemptions, nested config, unsafe casts, or user-specific paths. |
| Root manifest/scripts | Change required | `package.json`. | Adds focused type/test/check commands and includes `check:harness-governance` in `verification` exactly once. |
| Package manifests | N/A | No `apps/**/package.json` or `packages/**/package.json` dependency, export, version, or command changes are required. | Manifest diff is root-only. |
| Exports | N/A | No package export map or public entrypoint changes. | Packed/package owners remain byte-unchanged unless an implementation finding is explicitly accepted and re-planned. |
| Generated artifacts/generators | N/A | No OpenAPI, Fumadocs, route-tree, package renderer, lockfile, or public generated output changes. | Generated-owner diff remains empty. |
| Lint rule implementation | N/A | `tools/oxlint/**` owns unchanged portable/domain rules; only exact file allowlisting may change in `oxlint.config.ts`. | No new custom rule or weakened boundary rule. |
| CI workflow | N/A — preserve | `.github/workflows/quality.yml` already runs `bun run release:check -- --ci`; that graph begins with root verification. | `bun run check:quality-workflow` proves the workflow remains the exact read-only five-step shape. |
| Quality controls/automation | N/A — preserve | `tools/quality-workflow/**`, `docs/standards/controls.md`, and `docs/operations/automation-register.md` own the existing CI/control graph. | The focused gate is ordinary verification, not a new recurring automation loop. |
| HGI-203 proof | N/A — preserve | `docs/evidence/releases/HGI-203-*`, `docs/documentation-audit/HGI-203-*`, and `docs/verification/critical-journeys.json`. | Existing five journeys and accepted proof remain immutable; the new epoch adds distinct receipts. |
| HGI-204 runbooks | N/A — preserve | `docs/runbooks/**`, `tools/documentation/runbook-contract.json`, and `docs/operations/authority-model.md`. | Exactly four procedures remain; `bun run check:runbooks` passes and no procedure is copied into a skill. |
| HGI-205 CI/authority controls | N/A — preserve | `.github/workflows/quality.yml`, `tools/quality-workflow/**`, `docs/standards/controls.md`, and `docs/operations/automation-register.md`. | Existing report-only CI, action pins, denied operations, rollback, and recovery remain intact. |
| Critical journeys | Change required only for the new epoch binding | `docs/verification/critical-journeys.json` remains the journey owner; new scenario/receipt paths live under `tools/evals/` and `docs/documentation-audit/harness-foundation/`. | All five existing commands/oracles pass against the immutable migrated candidate; no journey contract is weakened. |
| Proof/evidence | Change required | New bounded candidate, source manifest, journey receipts, failures, independent review, and validation under `docs/documentation-audit/harness-foundation/**` and `tools/evals/**`. | Digests bind the exact candidate; failed/inconclusive attempts remain outside current routes. |
| Lifecycle | Change required | This SPEC/tasks/index, active/completed plan, `docs/README.md`, `docs/verification/harness-epochs.md`, and `docs/verification/effectiveness.md`. | Closeout occurs only after accepted requalification of the stable final profile. |
| Release | N/A | No version, Changeset consumption, tag, hosted release, publication, or registry operation. | Local release graph may be used as journey proof only and retains explicit non-claims. |
| Rollback | Change required as planning/proof | Task receipts and the new epoch owner must identify task-scoped revert order, retained evidence, and resume trigger. | Reversal never deletes failed/accepted evidence or rewrites HGI-203 through HGI-206 history. |
| Changeset | N/A | The implementation changes repository governance/docs/tooling only, not package installation, exports, public API, package behaviour, versions, or public docs. | Each task and final closeout record the no-Changeset rationale. |
| HTTP/API/SDK/provider/storage | N/A | Current package/app owners and Schemas remain unchanged; no external access is authorized. | No runtime/provider call graph change and no external actuality claim. |
| React/accessibility/browser UI | N/A | No route, container, leaf, UI state, accessibility, or browser import boundary changes. | Docs browser runs only as an unchanged requalification journey. |
| Deployment/observability | N/A | No deployment, hosted telemetry, provider state, secrets, dashboards, or production logs are read or changed. | Receipts distinguish local observations from hosted/external state. |

## Verification and acceptance

Every implementation task runs its focused checks before `bun run verification`.
`HFI-003` must create the target `test:harness-governance` and
`check:harness-governance` script keys before later tasks invoke them. The
currently executable repository closeout commands are:


bun run check:docs
bun run check:runbooks
bun run check:repository-paths
bun run verification
git diff --check
```

Requalification additionally runs the five commands owned by
`docs/verification/critical-journeys.json` and one fresh independent review
against the immutable candidate. `bun run release:check -- --ci` is local,
report-only journey evidence; it does not establish hosted CI or a release.

## Risks and tradeoffs

- Canonical skill sources may change again before implementation. The
  implementation must freeze the source by content digest at task start,
  compare the complete trees, and re-run `HFI-001` mapping if the accepted
  correction boundary changes.
- Replacing partial local folders with complete canonical trees can overwrite
  useful TaxKit-specific prose. Only the two repository profiles and declared
  extras may carry local policy; any other local-only rule must be promoted to
  a canonical source or explicitly accepted as a new overlay before copying.
- Mirroring JSON Schema contracts in executable Effect Schemas can drift. The
  focused validator must define one tested ownership route and reject
  incompatible schema/template pairs rather than maintain silent duplicates.
- Requalification can be expensive because the five journeys include the full
  local release graph. Run it once against the frozen accepted candidate after
  focused checks pass, and retain failures rather than rerunning without a new
  identity.

## Rollback and recovery

Each future implementation slice requires a named local commit authority before
`commitAfterPassing` can be exercised. If authority is absent, retain the
verified working tree and mark the task blocked; do not infer permission.

Rollback reverses accepted task-scoped commits in reverse dependency order,
restores the prior current owner pointers, and preserves:

- the HE structured audit and decision history;
- failed, blocked, deferred, superseded, and inconclusive receipts;
- HGI-203 through HGI-206 evidence and runbook/authority controls; and
- the last accepted skill baseline and epoch identity.

If the final requalification fails, the migrated candidate is not current
harness truth. Record the last successful check, observed state, recovery
owner, smallest unresolved decision, and resume trigger. Do not restore an old
epoch claim over changed skills.

## Limitations and non-claims

- `HFI-001` through `HFI-003` implement the profile foundation, Git-portable
  skill migration, and corrected fail-closed gate. Candidate
  `03716bf` passed all five journeys and fresh independent review but is
  invalidated by its volatile profile lifecycle paths. Candidate `f12c324` is
  also rejected and its local journey receipts remain terminal evidence only.
  Successor `7c8a96e` binds the stable final profile and corrected gate from one
  immutable commit and passed the five fresh journeys, focused epoch
  validation, and fresh independent review. HFI-005 reconciles the current
  epoch/effectiveness owners and closes this SPEC, task list, and plan.
- The HE table is a readable route only; the schema-valid
  `docs/documentation-audit/harness-foundation/accepted-findings.json` record
  is the executable accepted-finding crosswalk.
- The current global canonical skill collection was inspected as audit input,
  but no global path or mutable installation becomes repository runtime truth.
- No package, API, SDK, app, website, public documentation, provider, registry,
  deployment, release, publication, recovery, or external consumer state is
  changed or proved.
- A green local verification or release graph does not prove hosted CI,
  Git publication, registry state, deployment, provider state, public-site
  availability, or general harness effectiveness.

## References

- [`docs/README.md`](../README.md)
- [`writing-specs.md`](./writing-specs.md)
- [`writing-task-lists.md`](./writing-task-lists.md)
- [`implementing-specs.md`](../exec-plans/implementing-specs.md)
- [`testing-and-quality.md`](../architecture/testing-and-quality.md)
- [`tooling.md`](../standards/tooling.md)
- [`harness-epochs.md`](../verification/harness-epochs.md)
- [`effectiveness.md`](../verification/effectiveness.md)
- [`critical-journeys.json`](../verification/critical-journeys.json)
- [`HGI-206-validation.json`](../documentation-audit/HGI-206-validation.json)
- [repository-local docs-maintainer](https://github.com/crcorbett/commonplace-plugins/blob/main/plugins/development-workflows/skills/docs-maintainer/SKILL.md)
- [repository-local prd-writer](https://github.com/crcorbett/commonplace-plugins/blob/main/plugins/development-workflows/skills/prd-writer/SKILL.md)
