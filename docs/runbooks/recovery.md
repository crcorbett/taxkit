---
document_type: runbook
lifecycle: current
authority: canonical
owner: taxkit-recovery-operation-owner
last_reviewed: 2026-10-07
review_trigger: release evidence, recovery target, Git/provider topology, or authority change
---

# Recovery

Owner: `taxkit-recovery-operation-owner`

## Identity and resource scope

This runbook diagnoses an identified failed or suspect TaxKit release/version
attempt. It permits read-only local reconstruction. Any state-changing recovery
is a separately scoped consequential operation.

## Preconditions

Read `docs/evidence/releases/HGI-203-accepted-attempt.json`,
`docs/evidence/releases/HGI-203-failed-attempts.json`, and
`docs/operations/authority-model.md`. Identify artifact, environment, current
state, expected postcondition, last successful step and whether external state
was ever observed.

## Authority

The recovery-mutation principal is unknown. Diagnosis may inspect retained
local evidence. A mutation requires a named principal and exact operation,
resource, environment, approval boundary, duration/revocation, audit receipt,
rollback precondition and escalation owner.

## Procedure

1. Reconstruct an immutable attempt with
   `RELEASE_ATTEMPT_PATH=<repository-relative-receipt.json> RELEASE_ATTEMPT_SHA256=sha256:<64-hex-digest> bun run release:present`;
   do not rerun the release graph for presentation.
2. Inspect current version intent with `bun run changeset status --verbose`.
3. Compare the candidate, attempt, failed provenance and current files. Record
   the last known good state, failed invariant and evidence gaps.
4. Design the smallest target-specific recovery and its rollback, but do not
   execute it while authority is unknown.
5. After separately granted authority, execute only the approved target
   operation and capture pre/post readback. A provider recovery needs that
   provider's own runbook; TaxKit docs Cloudflare recovery is routed through
   `docs/runbooks/docs-deployment.md`, and this local runbook is insufficient.

### Doppler or GitHub bridge recovery

For a failed TaxKit Doppler source change, first identify the exact workflow
commit, GitHub scope and Doppler project/config metadata. Do not read or record
secret values.

The smallest recovery is to create and prove a read-only, expiring replacement
token for the same config, update only its matching GitHub bridge, read back
metadata and then revoke the failed token. For Production, also prove the
reviewer rule and fixed `prod` lock remain intact; never substitute
`stg_preview` or a Preview bridge. A reviewed source revert must stay
Doppler-only. Direct Turbo or Cloudflare GitHub values must not be recreated.

## Evidence and postcondition

### Native domain partial failure

The dated preparation read is retained at
`docs/documentation-audit/clean-slate-foundation/2026-10-07-domain-provider-readback.json`.

The replacement `TaxKitAppsCloudflare` graph and its version-three plan keep
the existing Production zone/settings retained. Preview omits them. Never use
Production stack destruction as rollback, or transfer an old `DocsWebsite`
receipt to the replacement pair. Identify both previous app artifacts and
their exact Worker/class/binding/domain identities first.

The native Worker provider uploads its script before reading shared redirect
rules. Its narrow patch stops rule replacement on an access/read failure; it
does not undo that earlier script upload. Preserve the failed receipt and last
successful step, then read script versions, bindings, attachments and shared
rules independently. Prepare only the smallest source-bound recovery under
separate approval, preserving foreign rules, DNS, registrar and DNSSEC state.
The [deployment runbook](docs-deployment.md) owns the exact targets and readback.
No cloud rollback is qualified by the local fixture checks.

Read-only diagnosis produces a bounded incident record with artifact identity,
environment, authority, observed evidence, failed invariant, recovery proposal,
limitations and non-claims. Mutation success additionally requires exact
target-system postcondition readback.

## Rollback

Every proposed mutation names the prior state and a tested way back before it
runs. Never use broad reset, deletion or evidence rewriting as recovery. Retain
failed and inconclusive provenance even when the target is restored.

## Escalation

Escalate an unknown principal, missing target identity, absent rollback,
conflicting evidence, provider involvement, credential scope, or inability to
establish current state to the requesting repository owner and target owner.

## Stop conditions

Stop before `versioning`, `commit`, `push`, `tag`, `release`, `registry-publication`,
`deployment`, `provider-access`, or `recovery-mutation` whenever full authority
is absent. Stop before destructive local changes when unrelated work overlaps
or the exact recovery target is unresolved.

## Limitations

Repository evidence can describe a prior observation but cannot prove current
Git-provider, registry, deployment, runtime or credential state.

## Non-claims

Diagnosis does not claim that recovery occurred. A local postcondition does not
claim external repair unless the authorized target system was read back.
