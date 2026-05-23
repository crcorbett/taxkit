---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Implementing Specs

Implement specs in small, verifiable slices.

## Flow

1. Read the target spec and task list.
2. Audit current code and docs before editing.
3. Implement the smallest useful slice.
4. Run the task's mandatory verification.
5. Record validation evidence in the active exec plan when one exists.
6. Commit only after the coherent slice passes verification.

## Guardrails

- Keep implementation aligned with package ownership docs.
- Prefer Effect services, layers, schemas and tagged errors for engine work.
- Do not defer all verification to the final slice.
- Keep public docs neutral to downstream private products.
