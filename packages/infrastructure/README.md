---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-09-23
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the docs Alchemy stage and one Website
resource declaration. Root `alchemy.run.ts` selects the Cloudflare provider
and state store, decodes the stage, and calls `declareDocsStack`. The docs app
owns Vite and the Worker code; it does not depend on this package.

The stack keeps `TaxKitDocsCloudflare`, `DocsWebsite`, `dev_<user>`,
`pr-N` and `prod` stable. It has no runtime binding, custom domain,
database or Axiom resource. Deployment admission, state/provider readback and
receipts live in `tools/docs-deployment`.

Run `bun run --filter=@taxkit/infrastructure check-types` and
`bun run --filter=@taxkit/infrastructure test` for local declaration proof.
These commands do not plan, deploy or prove provider state. See
[`docs/architecture/deployment.md`](../../docs/architecture/deployment.md)
and [the deployment runbook](../../docs/runbooks/docs-deployment.md).
