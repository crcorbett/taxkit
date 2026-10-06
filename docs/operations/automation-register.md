---
document_type: automation-register
lifecycle: current
authority: canonical
owner: taxkit-ci-release-maintainer
last_reviewed: 2026-10-07
review_trigger: workflow, signal, authority, proof, stopping, escalation, rollback, or retirement change
---

# TaxKit automation registers

The read-only Quality and context-candidate register is
[`tools/quality-workflow/automation-register.json`](../../tools/quality-workflow/automation-register.json).
It is validated by `bun run check:quality-workflow`; each entry has structured
signal and immutable-revision state, a named principal bound to one resource and
environment, per-run proof and nonclaims, fail-closed stop/escalation,
rollback/recovery owners and commands, and successor-gated retirement. The
validator checks those cross-field identities rather than accepting prose by
length or keywords. `externalState.status` remains `not-established` and its
nonclaims must match the proof envelope.

Quality CI is convergent validation of one immutable revision with `contents:
read` and Vercel Remote Cache read/write access on trusted token-bearing events.
After dependency-cache saves, same-repository pull requests and `main` fetch
the read-only single-config `taxkit/ci` values through repository
`DOPPLER_CI_TOKEN`, verify safe metadata and bind named Turbo outputs only to
the canonical release step with `local:rw,remote:rw`. Fork pull requests do not
fetch Doppler and run the complete graph with `local:rw`. Same-repository
pull-request code can access the resulting team-scoped remote-cache token under
Cooper's accepted contributor-trust boundary.
The remote cache resource contains Turbo task artifacts and logs only. Its CI
report has no candidate identity or attempt-receipt claim, and a cache hit does
not establish provider state.
Documentation/context freshness is not an unattended editor: it stages an
untrusted report-only candidate outside canonical/default retrieval, excludes
prior candidates and mutable/generated evidence, and requires a named reviewer,
separate publisher, publication status and last-known-good recovery before any
canonical edit.

Neither entry grants release, publication, deployment, provider, credential, or
external-state authority. A green local or hosted result does not establish
that GitHub ran, nor any tag, registry, deployment, provider or public
availability consequence.

The TaxKit Doppler configs and GitHub bridges are established. Merged-main
Quality proved the trusted `taxkit/ci` path at an exact revision. The retained
direct Turbo secret and variable were then removed under the dated hard-cutover
receipt. Hosted fork behaviour remains unproved.

The distinct docs owner is
[`tools/docs-deployment/automation-register.json`](../../tools/docs-deployment/automation-register.json).
Its three source operations are now explicitly `retired`; the five controls
are retained historical controls. `bun run check:docs-deployment-automation`
validates dated receipt identities without contacting a provider or admitting
an operation. The original register, controls, journeys, commands and workflow
bytes remain independently saved in the
[retention manifest](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json).
Established receipts refer to their recorded snapshots only.

The four old deployment/teardown/browser workflows now have only a manual
stop, no permissions, checkout, credential fetch or provider executable.
The separate read-only completed-run reconciler remains useful for historical
records. Its original workflow names and old resource identities are preserved.
Root old-development and receipt-writer commands fail before loading operation
configuration. Native process tests prove these stops. The static old Alchemy
entry refuses before session providers, remote state and planning, with the
startup limit of local logs and an empty profile recorded explicitly.

Native API/Website provider delivery belongs DEV-81. It needs its own exact
operation procedure, authority, plan and hosted proof. Retiring local source
and workflow wiring does not change provider resources, GitHub environments,
credential bridges or deployed sites, and does not authorise their deletion.
