---
document_type: package-guide
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-06
review_trigger: checked public examples or their package dependencies change
---

# @taxkit/docs-examples

This private workspace owns the four checked public integration templates in
`src/`: a server route, browser HTTP caller, Effect calculation and safe SDK
error handling. Public MDX links to these source files. The templates return
programs for an application-owned host; they do not start a server or own a
runtime. `test/examples.boundary.test.ts` retains the weekly pay result and
invalid-request expectations from the former docs-content example owner.

The examples depend on calculator, SDK and HTTP contracts. Keeping those
dependencies here lets the HTTP API consume docs-content contracts without
creating a circular package build graph. This package owns no content Schemas,
docs service, renderer, public route or generated catalogue.

It has no package exports or publication entrypoint.
`bun run --filter=@taxkit/docs-examples check-examples` checks the actual source
against the installed contracts. The standard package build emits the four
templates to `dist`; `check-types` checks both source and build configuration.
The output is application JavaScript and source maps, with no exported library
declaration contract.
`test` checks the exported server program. Consumers
copy these application templates rather than import a published package.

The docs-content Changeset records the command/dependency migration. This
workspace stays outside the fixed publication train. The move proves neither
package publication nor any deployed example. Operational
runbooks are N/A because this workspace performs no release or provider work.
Content validation remains owned by
[`docs-content`](../docs-content/README.md); package dependency direction is
owned by [package boundaries](../../docs/architecture/package-boundaries.md).
