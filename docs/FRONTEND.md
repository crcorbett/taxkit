# Frontend

The web app lives in `apps/web` and uses TanStack Start file routes.

## Package Boundaries

- `apps/web/src/routes` owns route composition and server functions.
- `apps/web/src/lib/runtime.server.ts` owns server-side Effect runtime composition.
- `packages/ui` owns shared React components and global Tailwind CSS.
- `packages/tax` owns tax-domain services and schemas.

## Component Rules

- Prefer existing `packages/ui` primitives before adding new components.
- Keep route components thin; move domain behavior into package services.
- Add package exports when a component or service becomes a cross-package dependency.
- Use `cva` for component variants and semantic tokens for styling.
