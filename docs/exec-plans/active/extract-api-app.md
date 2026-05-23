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
| API-002 | complete | Rewired web server and browser runtimes to the standalone API over HTTP. |
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
- 2026-05-23 API-002:
  - `bun x tsc --help` confirmed TypeScript `5.9.3` supports concrete
    `ES2024` and `ESNext` targets, not `ES2025`; set the repo target and
    package libs to `ES2024`.
  - `bun run --filter=web check-types` passed.
  - `bun run verification` passed, including Oxlint, Oxfmt check, Knip and
    Turbo typecheck.
  - Ran `bun run --filter=api start` on `http://127.0.0.1:4000` and
    `bun run --filter=web dev` on `http://127.0.0.1:4722`.
  - `GET http://127.0.0.1:4000/api/health` returned
    `200 {"service":"whattax","status":"ok"}`.
  - `GET http://127.0.0.1:4722/` returned `200` and contained
    `API status: <strong>ok</strong>`.
  - With `apps/api` stopped and `apps/web` still running,
    `GET http://127.0.0.1:4722/` returned `500` containing
    `Transport error (GET http://127.0.0.1:4000/api/health)`.
  - Import audit: `apps/web` has no
    `@whattax/http-api/client/server` imports. The only
    `@whattax/http-api/server` source import remains in
    `apps/web/src/lib/server/api-handler.server.ts`, intentionally pending
    API-003 removal.
