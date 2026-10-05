---
document_type: harness-effectiveness-record
lifecycle: current
authority: canonical
owner: taxkit-harness-owner
last_reviewed: 2026-07-30
review_trigger: repeated contradiction or worker, host, tool, runtime, skill, target, or scenario epoch change
---

# Harness effectiveness

Accepted HFI-004 epoch `HFI-004-2026-07-24` supplies target-specific evidence
for the smallest coherent intervention set:
maintainer routing, five local release journeys, five runbooks, authority model,
release graph, current plugin skills, the TaxKit harness profile,
and deterministic governance/epoch checks. Decisions remain evidence-bounded;
activity counts are not efficacy.

| Intervention | Decision | Evidence owner | Review trigger |
| --- | --- | --- | --- |
| Current maintainer router and lifecycle routing | Retain | `docs/README.md`, implemented harness-foundation SPEC, and completed plan route | stale-owner contradiction or lifecycle change |
| Current critical journeys and bounded historical release evidence | Retain | `docs/verification/critical-journeys.json`, content-addressed `docs/evidence/releases/HGI-203-critical-journeys.json` and HFI-004 epoch validation | current consumer boundary, historical snapshot digest or oracle change |
| Five canonical runbooks and authority stops | Retain provisionally | `docs/runbooks/README.md`, `docs/operations/authority-model.md`, preserved HGI-204/HGI-205 validation and the DCD-002 Preview/teardown chain | operation, principal, target, provider state, proof or recovery change |
| Four separate docs deployment journeys | Retain provisionally | `docs/verification/docs-deployment-journeys.json` and `docs/evidence/deployments/` | Worker build, Preview, Production, rollback or oracle change |
| Shared development skills | Use the latest plugin | `docs/skills.md` and `docs/skill-profiles/`; copied skill checks are retired | plugin or local profile change |
| Any causal comparison or ablation claim | Inconclusive | independent grader result | condition-blind comparison is available |

Candidate `7c8a96e` remains the accepted HFI-004 evidence for its original
router and skill/profile/gate decisions. The DCD-002 profile/runbook overlay is
a successor candidate and does not rewrite HFI-004 or its prior receipts.
Its exact-candidate Preview/teardown receipts add target-specific deployment
evidence but do not establish a broader harness epoch or causal comparison.
`Inconclusive` remains: there is no
condition-blind comparison or ablation, so no speed, quality, cost, or
general-effectiveness claim is made. The candidate and validation receipts
name the exact observations, limitations and recovery.
