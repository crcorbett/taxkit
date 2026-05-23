---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: low
---

# Deployment

The repo currently has a buildable TanStack Start scaffold and health API. The
long-term deployment shape is still early and should stay thin until the API,
docs site and SDK surfaces exist.

## Scope

This doc records deployment boundaries and known runtime targets. It should be
updated when `apps/api`, `apps/docs` or package publishing becomes real.

## Current Runtime Shape

- `apps/web` builds through Vite/TanStack Start.
- `@whattax/http-api` builds as a package and exposes the health API contract.
- Production calculation endpoints are not implemented yet.

## Planned Runtime Shape

- `apps/api` should host the reusable API server.
- `apps/docs` should host the public docs site.
- `packages/sdk/typescript` should publish browser-safe and server-safe SDK
  entrypoints.

## Guardrails

- Do not couple engine packages to deployment providers.
- Keep server-only handlers behind explicit server exports.
- Verify `bun run verification` before deployment changes.
- Add deployment-specific checks only when a real deploy target exists.

## Related Docs

- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Testing and quality](./testing-and-quality.md)
