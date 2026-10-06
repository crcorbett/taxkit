---
document_type: app-guide
lifecycle: tombstone
authority: supporting
owner: taxkit-content-owner
last_reviewed: 2026-10-07
successor: ../web/README.md
reason: The replacement Website owns the accepted documentation reader. The old workspace and deployment writers are retired.
---

# Retired documentation app

Use the [Website guide](../web/README.md) for current documentation development
and checks. This directory is no longer a workspace or runnable app.

The [retention record](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json)
identifies all 49 original sources, their exact saved bytes, useful page
addresses and historical deployment recovery records. The saved JSON source
bundle is data for inspection, not an active app or a complete rebuild checkout.
`bun run check:docs-deployment` verifies it and reads the saved deployment proof
without contacting providers.

The old root Alchemy entry and deployment workflows refuse new operations.
The native API/Website provider procedure belongs to DEV-81 and needs separate
approval. This retirement does not delete, deploy or change any hosted resource.
Ignored local build, dependency and state folders remain untouched.
