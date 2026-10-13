---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: SDK source, export map, packed file set, package manifest or downstream fixture change
---

# Packed consumer check

Run this when `@taxkit/sdk` exports, packed files or supported dependencies
change. It packs the SDK locally and installs it in a fresh consumer; it does
not touch npm.

1. `bun run sdk:check-packed-artifact` builds the SDK, packs it and checks the
   declared files and export paths in the tarball.
2. `bun run sdk:validate-downstream` installs that tarball in a temporary
   consumer, type-checks it and runs its public imports.

Both commands remove their temporary directories. A failure names the step that
failed. Packing should change no tracked file; if it does, inspect the diff
before removing anything.

A passing run shows that the local package works for a fresh consumer. It does
not show that npm holds the package or that a published version was installed.
