---
document_type: standard
lifecycle: current
authority: canonical
owner: taxkit-ci-release-maintainer
last_reviewed: 2026-07-22
review_trigger: public boundary, workflow, action, release graph, or repeated-review finding change
---

# Controls and automation governance

The Quality workflow is the executable CI owner for the local release-facing
graph. It has read-only repository permission, a timeout, cancellation
concurrency, an explicit `taxkit-ci-release-maintainer` pin-update owner, and
full-SHA action pins. It invokes `bun run release:check -- --ci` on every
configured pull request and push; there are deliberately no path filters, so a
new or renamed release boundary cannot be skipped. The Schema-decoded workflow,
control register and negative corpus are owned by `tools/quality-workflow/` and
run through `bun run check:quality-workflow`.

| Signal and named failure | Owner, fixture, evidence and recovery | Review trigger | Retirement |
| --- | --- | --- | --- |
| Workflow change; a floating action, write permission, unbounded run, other-job/comment spoof, or bypassed graph | `tools/quality-workflow/controls.json` entry `quality-workflow-semantics`; `policy.test.ts`, `check:quality-workflow`, bounded tagged finding and recovery | Workflow, action, public-boundary, or release-graph change | A stronger schema-decoded workflow policy replaces this exact contract. |
| Release-relevant revision; a boundary passes a partial local CI graph | `controls.json` entry `canonical-release-graph`; `@taxkit/scripts` CI report with owning failed command | Package, API, SDK, docs, manifest, workflow, or release-script change | A stronger canonical graph owns all nine ordered checks. |
| Proposed recurring context work; untrusted output enters canonical context or corroborates itself | `controls.json` entry `context-candidate-admission`; Schema-decoded report-only envelope | Candidate source, retrieval, reviewer, publisher, retention or recovery change | A separately accepted canonical context-governance owner replaces this contract. |

Controls are admitted only when their exact signal, prevented failure, owner,
fixture, evidence route, recovery, review trigger, and retirement condition
match the Schema-decoded register. Repeated findings move to the earliest
enforceable owner. The workflow configuration and local checks do not prove a
hosted run, publication, registry state, deployment, provider state, or external
consumer behaviour.
