# Architecture

WhatTax is a public Bun monorepo for tax-domain workflows.

## Layers

```
apps/web        TanStack Start routes, SSR, runtime composition
packages/ui     shared React components and Tailwind v4 tokens
packages/tax    tax-domain schemas, Effect service contracts, live layers
packages/core   cross-cutting helpers
```

`apps/web` composes package services through `apps/web/src/lib/runtime.server.ts`. Domain packages should expose `schemas.ts`, `service.ts`, and `live.ts` subpaths so the app can depend on contracts and layers without reaching into private files.

## Effect

- Services use `Context.Service`.
- Live implementations are exported as `Layer` values.
- Public shapes are `Schema` values with derived TypeScript types.
- Server functions run through the shared managed runtime.
