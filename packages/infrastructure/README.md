---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-10-04
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the docs Alchemy stage and one Website
resource declaration. Root `alchemy.run.ts` selects the Cloudflare provider
and state store, decodes the stage, and calls `declareDocsStack`. The docs app
owns Vite and the Worker code; it does not depend on this package.

Its explicit `./stage`, `./website` and `./stack` exports remain source-only:
callers need the repository's TypeScript-aware Alchemy/Bun toolchain. Shared
memo settings are readonly, including nested workspace arrays. The stack gives
Alchemy fresh arrays at the provider input because its current types require
writable arrays; callers must also copy these arrays before using a writable
provider input. Values, source selection and cache invalidation are preserved.

The stack keeps `TaxKitDocsCloudflare`, `DocsWebsite`, `dev_<user>`,
`pr-N` and `prod` stable. It has no runtime binding, custom domain,
database or Axiom resource. Deployment admission, state/provider readback and
receipts live in `tools/docs-deployment`.

Run `bun run --filter=@taxkit/infrastructure check-types` and
`bun run --filter=@taxkit/infrastructure test` for local declaration proof.
The test command uses Bun-hosted Vitest and the native Effect runner. It checks
stage acceptance/rejection, bounded log settings and the actual app-owned asset
header file through native file/path services. Compiler controls require both
top-level and nested memo arrays to remain readonly. Canonical strict rules
cover all package source/tests, with no test runtime execution permission.
These commands do not plan, deploy or prove provider state. See
[`docs/architecture/deployment.md`](../../docs/architecture/deployment.md)
and [the deployment runbook](../../docs/runbooks/docs-deployment.md).
