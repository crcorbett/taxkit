# WhatTax

Public tax-modeling workspace built as a Bun monorepo with TanStack Start, Tailwind v4, and Effect v4.

## Stack

- **Runtime:** [Bun](https://bun.sh) 1.3+
- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19, file-based routing, SSR)
- **Bundler:** Vite 8 with Rolldown
- **Build:** [Turborepo](https://turbo.build) (`turbo build --filter=web`)
- **UI:** shadcn/ui + Base UI on Tailwind v4 with custom tokens
- **Effects:** Effect v4 services and layers in workspace packages
- **Lint/format:** [Ultracite](https://github.com/harrysolovay/ultracite) (oxlint + oxfmt)
- **Deploy:** Vercel — Nitro `vercel` preset, `bun1.x` runtime

## Getting started

```bash
bun install
bun run dev          # all apps in dev mode
bun run build        # production build (turbo)
bun run check-types  # tsc --noEmit across the workspace
```

The web app starts at [http://localhost:3000](http://localhost:3000) or the `whattax` portless host if configured.

## Layout

```
apps/
  web/             TanStack Start app
packages/
  core/            cross-cutting helpers
  tax/             Effect service and schemas for tax-domain workflows
  ui/              shadcn + branded components, design tokens, MDX primitives
docs/              project documentation
```

## Documentation

[`AGENTS.md`](AGENTS.md) is the atlas — the table of contents for everything in `docs/` and the per-package READMEs. Start there.

Highlights:

- [`docs/DESIGN.md`](docs/DESIGN.md) — visual direction and design tokens.
- [`docs/FRONTEND.md`](docs/FRONTEND.md) — component inventory and composition rules.

## Known issues

- **Nitro is dev-disabled.** HTTP/2 + Transfer-Encoding bug under Bun ([TanStack/router#6050](https://github.com/TanStack/router/issues/6050)). Nitro only runs at `vite build`. No deploy impact.
- **TanStack Start prerender + Nitro Vercel preset is broken.** `start-plugin-core`'s preview-server-plugin hardcodes `dist/server/server.js` while the Vercel preset writes to `.vercel/output/...`. Tracked at [TanStack/router#6562](https://github.com/TanStack/router/issues/6562). Prerender currently disabled.
