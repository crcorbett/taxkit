---
"@taxkit/core": patch
---

Remove the unused automatic Node type-package requirement from Core's compiler
configuration. Source and test checking use explicit imports, and the inherited
source-only build now works without Node types supplied by another workspace.
Runtime exports, emitted package paths and calculation results are unchanged.
