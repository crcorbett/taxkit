---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: low
---

# Deployment

The repo currently has a standalone Bun API app, a buildable TanStack Start
scaffold and a health-only HTTP API package. The long-term deployment shape is
still early and should stay thin until calculation endpoints, the docs site and
SDK surfaces exist.

## Scope

This doc records deployment boundaries and known runtime targets. It should be
updated when `apps/docs`, package publishing or a real hosting target becomes
real.

## Current Runtime Shape

- `apps/api` runs as a Bun HTTP server and serves `/api/*`.
- `apps/web` builds through Vite/TanStack Start and calls `apps/api` over HTTP.
- `@whattax/http-api` builds as a package and exposes the health API contract.
- Production calculation endpoints are not implemented yet.

## Planned Runtime Shape

- `apps/docs` should host the public docs site.
- `packages/sdk/typescript` should publish browser-safe and server-safe SDK
  entrypoints.

## Local Runtime Shape

Run the API and web app as separate local processes:

```sh
bun run --filter=api dev
bun run --filter=web dev
```

`apps/api` defaults to `http://127.0.0.1:4000`. The web app uses that origin by
default and can be pointed elsewhere with `WHATTAX_API_BASE_URL` and
`VITE_WHATTAX_API_BASE_URL`.

## Guardrails

- Do not couple engine packages to deployment providers.
- Keep server-only handlers behind explicit server exports.
- Verify `bun run verification` before deployment changes.
- Add deployment-specific checks only when a real deploy target exists.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Testing and quality](./testing-and-quality.md)
