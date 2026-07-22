---
document_type: harness-effectiveness-record
lifecycle: current
authority: canonical
owner: taxkit-harness-owner
last_reviewed: 2026-07-22
review_trigger: HGI-206 independent result, repeated contradiction, or epoch change
---

# Harness effectiveness

HGI-206 uses the smallest current intervention set: the maintainer router,
five-journey inventory, four runbooks, authority model, release graph, local
skills and repository enforcement. It records a decision for each rather than
treating activity counts as efficacy.

| Intervention | Decision | Evidence owner | Review trigger |
| --- | --- | --- | --- |
| Current maintainer router and active-intent routing | Retain pending independent grade | `docs/README.md` and HGI-206 candidate | stale-owner contradiction or lifecycle change |
| Five critical journeys and bounded release evidence | Retain pending independent grade | `docs/verification/critical-journeys.json` | consumer boundary or oracle change |
| Four canonical runbooks and authority stops | Retain pending independent grade | `docs/runbooks/README.md` and `docs/operations/authority-model.md` | operation, principal, or recovery change |
| Repo-local skills and lint/test policy | Retain pending independent grade | `.agents/skills/**`, `tools/skills/**`, `tools/oxlint/**` | skill or enforcement change |
| Any causal comparison or ablation claim | Inconclusive | independent grader result | condition-blind comparison is available |

`Retain pending independent grade` is not acceptance. `Inconclusive` is retained
because this single epoch has no condition-blind comparison. The candidate
receipt names the exact observations, limitations and next owner.
