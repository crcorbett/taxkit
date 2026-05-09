# Repo Atlas

This repo follows the `/Users/cooper/Projects/site` monorepo shape: Bun workspaces, Turbo tasks, package-level `tsdown` builds, TanStack Start in `apps/web`, and Effect v4 services in domain packages.

## Map

- `apps/web` — TanStack Start app and route composition.
- `packages/core` — small cross-cutting helpers.
- `packages/tax` — tax-domain schemas, services, and live Effect layers.
- `packages/ui` — shared React UI primitives and Tailwind v4 tokens.
- `docs/DESIGN.md` and `docs/FRONTEND.md` — inherited design-system notes; update as WhatTax’s product language settles.

## Working Agreements

- Add domain logic to a package first, then compose it into `apps/web` through `runtime.server.ts`.
- Keep Effect services explicit: `service.ts` for contracts, `live.ts` for live layers, `schemas.ts` for public data shapes.
- Keep package exports current when adding files that other packages import.
