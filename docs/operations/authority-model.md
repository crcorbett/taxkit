---
document_type: authority-model
lifecycle: current
authority: canonical
owner: taxkit-authority-model-owner
last_reviewed: 2026-07-22
review_trigger: identity, release, Git, registry, deployment, provider, credential, or recovery change
---

# TaxKit operational authority

Capability is not authority. Repository access or a runnable command does not
identify the principal permitted to perform a consequential operation. Each
run must bind identity, operation, resource, environment, approval boundary,
duration or revocation, audit receipt, rollback precondition, and escalation.

The repository carries no standing authority for the operations below. Their
principal is `unknown`, so their status is `unknown-stop`:

| Operation | Principal | Status | Required authority receipt |
| --- | --- | --- | --- |
| `versioning` | `unknown` | `unknown-stop` | Named principal; exact package/version train; local checkout; approval scope and duration; before/after manifest receipt; identified revert target. |
| `commit` | `unknown` | `unknown-stop` | Named principal; exact paths, branch and message; approval duration; commit/tree readback; accepted semantic scope and revert owner. |
| `push` | `unknown` | `unknown-stop` | Named principal; remote, branch and expected commit; approval duration; remote SHA readback; prior remote state and recovery authority. |
| `tag` | `unknown` | `unknown-stop` | Named principal; provider, commit and immutable tag; approval duration; provider readback; provider-specific recovery. |
| `release` | `unknown` | `unknown-stop` | Named principal; provider, target commit and hosted release identity; approval duration; release readback; provider-specific recovery. |
| `registry-publication` | `unknown` | `unknown-stop` | Named principal; registry and exact package/version set; credential expiry/revocation; registry readback; deprecation/recovery plan. |
| `deployment` | `unknown` | `unknown-stop` | Named principal; provider-specific app/infrastructure target; environment and duration; provider/runtime readback; tested rollback and reconciliation. |
| `provider-access` | `unknown` | `unknown-stop` | Named principal and identity; exact provider operation/resource/environment; credential duration/revocation; provider receipt; provider-specific recovery. |
| `recovery-mutation` | `unknown` | `unknown-stop` | Named principal; exact recovery target/environment/operation; approval duration; pre/post identity; identified rollback artifacts. |

Read-only local diagnosis and static validation may proceed within the user's
stated task. When any required field is absent, stop before the operation and
escalate to the requesting repository owner. Never infer authority from prior
runs, tool capability, credentials being present, or evidence that a different
principal acted earlier.

The exact machine-checked records live in
`tools/documentation/runbook-contract.json`. That sidecar and this table must
agree; neither grants authority. Provider/registry/deployment claims require
current target-system readback by the authorized principal.
