---
document_type: package-guide
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-18
review_trigger: checked public examples or their package dependencies change
---

# @taxkit/docs-examples

This private workspace owns the checked public integration templates in `src/`:
server and browser integrations, Effect calculation, error handling, calculator
help, input validation and a fact definition, plus the integration-test fixture
in `test/`. Public MDX links to these source files. The templates return
programs for an application-owned host; they do not start a server or own a
runtime. `test/examples.boundary.test.ts` retains the original weekly pay result and
invalid-request expectations.

Application examples use the single SDK package, including its Core, AU and
HTTP entry points. The contributor fact example still uses the internal source
owners; HTTP integration tests use the private in-process server. Keeping
examples here lets the HTTP API consume Content contracts without
creating a circular package build graph. This package owns no content Schemas,
docs service, renderer, public route or generated catalogue.

It has no package exports or publication entrypoint.
`bun run --filter=@taxkit/docs-examples check-examples` checks the actual source
against the installed contracts. The standard package build emits the source
templates to `dist`; `check-types` checks both source and build configuration.
The output is application JavaScript and source maps, with no exported library
declaration contract.
`test` checks the exported server program. Consumers
copy these application templates rather than import a published package.

The SDK Changeset records changes to these public package examples. This
workspace stays private and is not a publication requirement. Checks prove
neither package publication nor any deployed example. Operational
runbooks are N/A because this workspace performs no release or provider work.
Content checks remain owned by
[`@taxkit/content`](../content/README.md); package dependency direction is
owned by [package boundaries](../../docs/architecture/package-boundaries.md).


The validation, calculator-help and raw HTTP error examples are checked sources
for their complete copied public MDX fences.
`test/published-snippets.test.ts` rejects copy drift. The checker uses the root's selected Node types for standard
Node/browser request APIs; the templates do not use Bun-specific globals.
Tests keep the original weekly-pay oracle and invalid-request cases and add
external-input rejection, error-envelope decoding and actual HTTP metadata
route checks. No example or test establishes statutory accuracy for retained
calculation fixtures or public API availability.

The fact definition and integration-test guides also use complete checked
fences. The integration example executes as a real test suite; the fact
example compiles against the owning Money and PayPeriod schemas.

Current example links use the checked-example revision recorded in
[`content/docs/repository.json`](../../content/docs/repository.json).
`test/published-snippets.test.ts` checks that each copied guide fence equals
its checked example file, and uses `git show` to compare every linked checked
file byte-for-byte with that revision. Advancing a template therefore requires
recording a matching revision. No network lookup or branch name is used by this
check.
