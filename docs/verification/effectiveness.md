---
document_type: harness-effectiveness-record
lifecycle: current
authority: canonical
owner: taxkit-harness-owner
last_reviewed: 2026-07-22
review_trigger: repeated contradiction or worker, host, tool, runtime, skill, target, or scenario epoch change
---

# Harness effectiveness

HGI-206 uses the smallest current intervention set: the maintainer router,
five-journey inventory, four runbooks, authority model, release graph, local
skills and repository enforcement. It records a decision for each rather than
treating activity counts as efficacy.

| Intervention | Decision | Evidence owner | Review trigger |
| --- | --- | --- | --- |
| Current maintainer router and lifecycle routing | Revise | `docs/README.md`, completed plan route, and HGI-206 lifecycle correction | stale-owner contradiction or lifecycle change |
| Five critical journeys and bounded release evidence | Retain | `docs/verification/critical-journeys.json` and HGI-206 validation | consumer boundary or oracle change |
| Four canonical runbooks and authority stops | Retain | `docs/runbooks/README.md`, `docs/operations/authority-model.md`, and HGI-206 validation | operation, principal, or recovery change |
| Repo-local skills and lint/test policy | Retain | `.agents/skills/**`, `tools/skills/**`, `tools/oxlint/**`, and HGI-206 validation | skill or enforcement change |
| Any causal comparison or ablation claim | Inconclusive | independent grader result | condition-blind comparison is available |

The lifecycle route is `Revise` because the first accepted closeout left stale
in-progress pointers; the correction updates the current router, SPEC/indexes,
and completed plan without changing the epoch evidence. `Inconclusive` remains
because this single epoch has no condition-blind comparison. The candidate and
validation receipts name the exact observations, limitations, and recovery.
