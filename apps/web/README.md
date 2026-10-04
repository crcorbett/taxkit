---
status: canonical
last_reviewed: 2026-10-04
source_of_truth: package-readme
confidence: high
---

# Web App

Current TanStack Start scaffold for TaxKit.

## Scope

`apps/web` proves the current browser/server runtime split and calls the
standalone Effect HTTP API service owned by `apps/api`. It is not the
long-term calculation engine and should not own tax-domain contracts or API
request handling.

## Main Areas

- `src/routes/`: TanStack Router routes
- `src/lib/runtime.server.ts`: server `ManagedRuntime`
- `src/lib/runtime.client.ts`: client `ManagedRuntime`
- `src/lib/route-context.ts`: route runtime contract and context selection
- `src/lib/runtime-selection.ts`: isomorphic selection of the server/client runtime
- `src/server.ts`: server entrypoint

## Runtime Shape

The root route loads `@taxkit/api-http/client` through the route runtime and
renders API health status from the standalone API service over HTTP.
Server-only API exports must stay out of browser code.

The web runtime reads the API origin from:

- `TAXKIT_API_BASE_URL` on the server
- `VITE_TAXKIT_API_BASE_URL` in the browser

Both are required runtime config values and are validated with Effect Config and
Effect Schema. `bun run --filter=web dev` injects both from
`portless get api.taxkit`. Do not include `/api` in the base URL; the typed
API client owns route prefixes.

## Guardrails

- Keep tax rules, facts and calculators in engine packages.
- Use browser-safe API client exports from routes.
- Do not import `@taxkit/api-http/server` from browser code.
- Keep route data acquisition and trust-boundary conversion route-high. Render
  the page shell and semantic landmarks before passing focused readonly values
  and callbacks to leaves.
- Keep local UI commands in leaves; keep remote or domain commands in the route
  action or nearest policy-owning container.
- Put loading, empty and recoverable error UI at the smallest owning boundary
  while preserving a stable footprint and the surrounding page shell.
- Keep the app README local; route durable architecture to `docs/architecture`.

## Commands

```bash
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=web check-types
bun run --filter=web build
```

Run `apps/api` before loading the web root locally. Without the API process,
the root route should fail with an attributable HTTP transport error rather
than silently falling back to an in-process API.

Use the portless URLs for local browser and app-to-app checks:

- API: `https://api.taxkit.localhost`
- Web: `https://taxkit.localhost`

## Related Docs

- `docs/architecture/frontend.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/deployment.md`
- `docs/design-docs/abstraction-admission.md`

## Atom compatibility proof

`bun run web:test:browser` builds the web app and runs the Chromium qualification
in `src/lib/atom-lifecycle.browser.test.tsx`. It is part of root `verification`.
The fixture uses Effect test scopes to dispose React roots on failure and proves
SSR hydration without errors, one registry through StrictMode effect remount,
50 rapid updates, scheduled/cancelled work and final resource disposal. It does
not yet replace the app's existing runtime or qualify RPC cancellation.

The exact candidate is Atom 4.0.0, React/React DOM 19.3.0 and Scheduler 0.28.0.
The root patch changes only Atom's Scheduler peer range to admit exactly 0.28.0;
remove it when upstream metadata admits that version. One Scheduler version is
present in the lockfile. Bun resolves peers from registry metadata before patching
and may still print the original peer warning; the installed manifest and runtime
fixture are the qualified correction. Atom/Scheduler are development dependencies
until the application migration adopts their runtime owner.

The browser test config extends Vite's browser conditions with `source`; replacing
the defaults with only `source` selects the Node renderer and is not a valid
browser hydration test. The test imports the actual browser renderer and waits
for hydration before issuing updates.
