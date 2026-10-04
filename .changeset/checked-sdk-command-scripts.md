---
"@taxkit/sdk": patch
---

Check SDK command scripts with TypeScript and the canonical strict rules.
Decode package manifests once, scope command lifetimes, bound captured stdout
and fail when a search or temporary-folder cleanup cannot complete. Retain
safe step/exit diagnostics without exposing captured command output.
