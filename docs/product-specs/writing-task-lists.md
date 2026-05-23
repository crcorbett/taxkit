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

## Task Quality Bar

Each task should:

- produce a reviewable repo state
- prove one or two important assumptions
- name concrete outputs
- include `bun run verification` in mandatory verification gates
- include browser verification when a user-facing route changes
- include architecture audits when boundaries, schemas or runtime ownership move

Prefer progressive end-to-end slices over package-by-package TODO lists.
