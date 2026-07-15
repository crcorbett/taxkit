---
status: canonical
last_reviewed: 2026-06-25
source_of_truth: docs
confidence: medium
---

# Deployment

The repo currently has a standalone Bun API app, a buildable TanStack Start
web scaffold, a buildable TanStack Start docs app, an HTTP API package with
public calculation routes and a private TypeScript SDK package. The long-term
deployment shape is still early and should stay thin until a real hosting
target exists.

## Scope

This doc records deployment boundaries and known runtime targets. It should be
updated when package publishing or a real hosting target becomes real.

## Current runtime shape

- `apps/api` runs as a Bun HTTP server and serves `/api/*`.
- `apps/web` builds through Vite/TanStack Start and calls `apps/api` over HTTP.
- `apps/docs` builds through TanStack Start and renders public MDX docs through
  `@taxkit/docs-content` and `@taxkit/docs-fumadocs`.
- `@taxkit/api-http` builds as a package and exposes health, generated docs,
  OpenAPI JSON, metadata and public calculation route contracts.
- `@taxkit/sdk` builds as a private package for local and downstream
  validation. It has not been published to npm.

## Planned runtime shape

- `apps/api` should remain the standalone public API runtime.
- `apps/docs` should host the public docs site once a deployment target is
  chosen.
- `packages/sdk/typescript` should publish browser-safe, Effect-native, schema,
  testing and jurisdiction subpath entrypoints after explicit release approval.

## Local runtime shape

Run the API, web app and docs app as separate local processes:

```sh
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=docs dev
```

`apps/api` dev runs through portless as `https://api.taxkit.localhost`.
`apps/web` dev injects that URL into `TAXKIT_API_BASE_URL` and
`VITE_TAXKIT_API_BASE_URL` before serving through portless as
`https://taxkit.localhost`. `apps/docs` serves through portless as
`https://docs.taxkit.localhost`. Production deployment should provide
equivalent API base URL environment values explicitly.

## Guardrails

- Do not couple engine packages to deployment providers.
- Keep server-only handlers behind explicit server exports.
- Verify `bun run verification` before deployment changes.
- Add deployment-specific checks only when a real deploy target exists.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Testing and quality](./testing-and-quality.md)
