---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# TypeScript Config

Shared TypeScript configuration package for WhatTax workspace packages and
apps.

## Scope

`@whattax/tsconfig` owns reusable TypeScript config exports for the monorepo.
It currently exports the shared base config used by package-level
`tsconfig.json` files.

## Main Areas

- `base.json`: shared config that extends the repo root
  `tsconfig.base.json`.
- `package.json`: package export map for config consumers.

Export paths:

- `@whattax/tsconfig/base`
- `@whattax/tsconfig/package`

## Runtime Shape

This package has no runtime application code. It is a private workspace package
used by TypeScript tooling through package exports.

Package and app configs should extend the exported base config when they need
the shared repo defaults, then add package-local include, exclude, emit and
framework settings.

## Commands

This package does not define build or typecheck scripts today. Validate
consumers through the repo-level commands:

```sh
pnpm check-types
pnpm build
```

## Guardrails

- Keep this package limited to shared TypeScript configuration.
- Do not put app, API, SDK or engine runtime code here.
- Prefer package-local overrides for package-specific emit, framework or test
  needs.
- Update this README when new config exports are added.

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/testing-and-quality.md`
- `docs/product-specs/documentation-improvement-roadmap.md`
