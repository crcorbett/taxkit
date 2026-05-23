---
status: active
last_reviewed: 2026-05-23
source_of_truth: exec-plan
confidence: medium
---

# Extract API App Execution Plan

## Spec

- [Extract API app](../../product-specs/extract-api-app.md)
- [Task list](../../product-specs/extract-api-app.tasks.json)

## Execution Rules

- Implement tasks sequentially.
- Delegate one task at a time to a subagent.
- Parent agent reviews the diff, runs `bun run verification`, runs
  task-specific smoke checks, and accepts the task before delegating the next.
- Commit each accepted task when its `commitAfterPassing` flag is true.

## Progress

| Task | Status | Notes |
| --- | --- | --- |
| API-001 | complete | Added standalone Bun API app with one process `ManagedRuntime`, Bun server layer and signal disposal. |
| API-002 | pending | Rewire web app to external API. |
| API-003 | pending | Remove TanStack-mounted API routes. |
| API-004 | pending | Update docs and final verification. |

## Validation Log

- 2026-05-23 API-001:
  - `bun run --filter=api check-types` passed.
  - `bun run --filter=api build` passed.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `API_PORT=4012 bun run --filter=api start`; `GET /api/health`
    returned `200 {"service":"whattax","status":"ok"}`.
  - Ran `GET /api/docs/openapi.json`; response parsed as OpenAPI `3.1.0`
    with title `WhatTax API` and `/api/health` present.
  - Ran `API_PORT=4013 bun apps/api/src/index.ts`, sent `SIGTERM` to the Bun
    entrypoint process, and observed `WhatTax API received SIGTERM; shutting
    down` followed by `WhatTax API stopped` with exit code `0`.
  - Audited `apps/api/src/runtime.ts`, `apps/api/src/server.ts` and
    `apps/api/src/index.ts`: the app creates one `ManagedRuntime` at process
    startup and no runtime inside request handling.
