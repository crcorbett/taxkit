---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: high
---

# Writing Spec Task Lists

Use a sibling task list when a product spec needs ordered implementation spikes
and explicit verification gates.

## Shape

```json
{
  "$schema": "https://whattax.local/schemas/product-spec-task-plan.v1.json",
  "spec": "docs/product-specs/example.md",
  "title": "Example Implementation Tasks",
  "status": "draft",
  "last_reviewed": "2026-05-23",
  "principles": [],
  "globalVerification": {
    "commitPolicy": "",
    "requiredBeforeFinalPR": ["bun run verification"],
    "evidenceRequired": []
  },
  "tasks": []
}
```

Tasks that will be delegated should include an implementation prompt, or an
equivalent field in the task object, that embeds the mandatory subagent
contract from `docs/exec-plans/implementing-specs.md` followed by task-specific
files, outputs and verification gates.

Example task shape:

```json
{
  "id": "task-001",
  "title": "Implement the first end-to-end slice",
  "implementationPrompt": "Paste the Mandatory Subagent Contract here, followed by task-specific files, outputs and gates.",
  "mandatoryVerification": ["bun run verification"],
  "completionCriteria": [
    "Parent agent reviewed the diff against the spec, task and architecture docs.",
    "Parent agent verified canonical Effect/schema/type/id reuse.",
    "Parent agent accepted the task before the next delegation."
  ],
  "commitAfterPassing": true
}
```

## Task Quality Bar

Each task should:

- produce a reviewable repo state
- prove one or two important assumptions
- name concrete outputs
- include `bun run verification` in mandatory verification gates
- include browser verification when a user-facing route changes
- include architecture audits when boundaries, schemas or runtime ownership move
- include Effect-native and canonical-type prompt guidance when delegated
- require parent review and acceptance before the next delegated task starts

Prefer progressive end-to-end slices over package-by-package TODO lists.
