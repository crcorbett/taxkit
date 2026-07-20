---
document_type: execution-plan
lifecycle: historical
authority: supporting
owner: taxkit-execution-history-owner
last_reviewed: 2026-07-20
review_trigger: historical rollout, proof, or successor correction
successor: null
tombstone: false
---

# Docs Fumadocs package separation execution plan

Spec:
[Docs Fumadocs package separation](../../product-specs/docs-fumadocs-package-separation.md)

Task list:
[`docs-fumadocs-package-separation.tasks.json`](../../product-specs/docs-fumadocs-package-separation.tasks.json)

Goal:
Implement the docs Fumadocs package separation task list sequentially. Each
task is delegated to one subagent when available; the parent agent reviews,
audits, verifies and accepts each task before delegating the next task. If the
same task fails parent audit three times, stop for replan or user decision.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| DOCS-FUMA-001 | completed | Created reusable `@taxkit/docs-fumadocs` package and parent accepted after audits. |
| DOCS-FUMA-002 | completed | Refactored docs-content onto reusable Fumadocs config/source internals and parent accepted after audits. |
| DOCS-FUMA-003 | completed | Rendered docs pages through Fumadocs compiled MDX and parent accepted after browser evidence/audits. |
| DOCS-FUMA-004 | completed | Strengthened MDX validation, component policy and package docs; parent accepted after audits. |
| DOCS-FUMA-005 | completed | Updated architecture docs, package READMEs and final call graphs; parent accepted after docs audits. |

## Validation log

### 2026-06-14 - Planning baseline

- Read the `prd-implementer` skill instructions and canonical implementation
  docs.
- Read the target spec and task list.
- Read relevant architecture docs for content, frontend, package ownership and
  Effect service patterns.
- Created an active implementation goal requiring strict sequential task
  execution, one subagent per task, parent review, Effect/code-quality audits,
  verification and acceptance before the next delegation.
- Delegated `DOCS-FUMA-001` to a worker with the exact task scope,
  verification gates, three audit passes and Changeset requirement.
- Changeset rationale: no Changeset is required for this planning baseline
  because it only adds an active execution plan. Package-facing implementation
  slices will make their own Changeset decisions.

### 2026-06-14 - DOCS-FUMA-001 implementation and parent acceptance

- Delegated the reusable `@taxkit/docs-fumadocs` package creation task to a
  worker.
- Added `packages/docs-fumadocs` with generic Fumadocs configuration helpers,
  Effect Schema to Standard Schema bridging, reusable meta/code-block schemas,
  source loader Effect wrappers, page-tree conversion helpers, browser-safe
  React render primitives, tests and README guidance.
- Added `.changeset/docs-fumadocs-package.md` for the package-facing private
  workspace package.
- Parent audit found and fixed two issues before acceptance:
  - Removed ignored `dist/` output from the committed worktree after package
    build.
  - Reworked the page-tree adapter to remove repeated one-field optional
    helpers while preserving exact optional Fumadocs `PageTree` types.
- Audit pass 1, package exports and import graph:
  - `@taxkit/docs-fumadocs` exposes root, `./config`, `./source`, `./tree`,
    `./render` and `./schemas`.
  - Browser-safe exports are separated from build-time and server/source
    helpers by explicit subpaths.
  - `rg -n "@taxkit/docs-content" packages/docs-fumadocs` returned no
    matches.
- Audit pass 2, Effect-native control flow and canonical schemas:
  - Generic schemas and tagged source errors are owned in
    `packages/docs-fumadocs/src/schemas.ts`.
  - Source helpers return typed `Effect` failures.
  - Tree conversion uses `Match` for closed node variants and `Option` for
    exact optional Fumadocs fields.
- Audit pass 3, helper sprawl:
  - Replaced repeated field-level helpers with boundary-level page item,
    separator and folder adapters.
  - Remaining helpers name reusable Fumadocs integration boundaries.
- Verification passed:
  - `bun run --filter=@taxkit/docs-fumadocs build`
  - `bun run --filter=@taxkit/docs-fumadocs check-types`
  - `bun run --filter=@taxkit/docs-fumadocs test`
  - `bun run verification`
  - `rg -n "@taxkit/docs-content" packages/docs-fumadocs`
  - `rg -n "switch \\(|Object\\.values|Object\\.entries| as " packages/docs-fumadocs`
- Call graph status: this slice matches the target Fumadocs package portion of
  the spec. `@taxkit/docs-content` still has not been refactored onto the new
  package; that is `DOCS-FUMA-002`.

### 2026-06-14 - DOCS-FUMA-002 implementation and parent acceptance

- Refactored `packages/docs-content/source.config.ts` to use
  `@taxkit/docs-fumadocs/config` helpers for Effect Schema to Standard Schema
  bridging and shared MDX options.
- Added a server-only generated Fumadocs source loader in
  `packages/docs-content/src/server.ts`.
- Refactored `DocsContentServiceLive` so page lookup/listing uses
  `@taxkit/docs-fumadocs/source` over the generated Fumadocs source instead of
  validation-policy navigation pages.
- Kept existing `getPage` and `listPages` serialisable for the current docs app
  route, and added `getRenderablePage` and `listRenderablePages` for compiled
  Fumadocs page data needed by the app-rendering follow-up.
- Removed page lookup/listing from `src/validation/policy.ts`; validation keeps
  raw source-text reads for frontmatter, local links, examples and OpenAPI
  reference checks.
- Added `.changeset/docs-content-fumadocs-source.md` for the
  `@taxkit/docs-content` behaviour change.
- Audit pass 1, current and target call graphs against actual imports:
  - Source config now calls `@taxkit/docs-fumadocs/config`.
  - Service page lookup/listing now calls `@taxkit/docs-fumadocs/source` over
    `fumadocs-core/source` and `.source/server`.
  - `apps/docs` rendering was not modified; DOCS-FUMA-003 remains pending.
- Audit pass 2, schema decode ownership:
  - `DocsPageFrontmatter`, `DocsNavigation`, `DocsPagePath`, `DocsPageSlug`,
    `DocsSourcePath`, `DocsValidationIssue`, `DocsPageNotFoundError` and
    `DocsSourceError` remain owned and reused from `@taxkit/docs-content`.
  - Frontmatter and navigation decode still use Effect Schema-owned contracts.
- Audit pass 3, validation policy:
  - No generic Shiki, Mermaid or Standard Schema bridge logic remains in
    `@taxkit/docs-content`.
  - Raw file reads remain in validation policy for source-text checks.
- Verification passed:
  - `bun run --filter=@taxkit/docs-content build`
  - `bun run --filter=@taxkit/docs-content check-types`
  - `bun run --filter=@taxkit/docs-content test`
  - `bun run --filter=@taxkit/docs-content validate`
  - `bun run verification`
  - `rg -n "from [\\\"']react|\\.tsx|createFileRoute|route|layout|renderer|MdxDocument|@tanstack/react-router|@tanstack/react-start" packages/docs-content --glob '!README.md' || true`
    returned no matches.
  - `rg -n "DocsPageFrontmatter|DocsNavigation|DocsPageNotFoundError|DocsSourceError|DocsValidationIssue|Schema\\.decodeUnknownEffect\\(Docs" packages/docs-content/src packages/docs-content/source.config.ts`
    confirmed canonical docs-content schema and tagged-error reuse.
- Call graph status: this slice matches the DOCS-FUMA-002 portion of the target
  graph. The app renderer still has not been switched to compiled MDX; that is
  DOCS-FUMA-003.

### 2026-06-14 - DOCS-FUMA-003 implementation and parent acceptance

- Delegated the app rendering task to a worker and reviewed the resulting
  route, loader and renderer changes as parent.
- Replaced the app-local hand-written markdown renderer with Fumadocs compiled
  MDX through the browser-safe `@taxkit/docs-content/client` collection.
- Added app-local route boundary schemas in
  `apps/docs/src/lib/docs/route-boundary.ts` for home/page loader successes,
  serialised `Exit` values and typed preload failures.
- Updated docs route loaders to return encoded route-boundary exits and preload
  compiled MDX modules for the requested renderable page.
- Updated app routes to decode route results with `Match.tags`, keeping page
  unavailable branches explicit and closed.
- Added the Fumadocs MDX Vite plugin to `apps/docs/vite.config.ts`.
- Parent audit found and fixed three issues before acceptance:
  - Corrected docs-content `source` paths so section indexes map to
    `content/{section}/index.mdx` and nested pages map to
    `content/{section}/{page}.mdx`.
  - Added an inline SVG favicon link to remove the browser `/favicon.ico` 404
    console error.
  - Improved mobile table and code-block CSS so wide compiled MDX tables scroll
    instead of compressing words.
- Audit pass 1, loader schemas and serialisation boundaries:
  - Loader successes and failures are schema-owned at the app route boundary.
  - The server function returns encoded `Exit` values; routes decode before
    rendering.
- Audit pass 2, renderer ownership:
  - Reusable `Picture` and `Pre` primitives come from
    `@taxkit/docs-fumadocs/render`.
  - TaxKit-specific anchor normalisation and route preload errors stay in
    `apps/docs/src/lib`.
- Audit pass 3, browser-safe imports:
  - `apps/docs/src/lib/mdx/components.tsx` imports the browser-safe
    `@taxkit/docs-content/client` export.
  - `rg -n "@taxkit/docs-content/server|\\.source/server" apps/docs/src || true`
    returned no matches.
- Audit pass 4, desktop/mobile screenshots:
  - Home:
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/home-desktop-1440x1000.png`
    and
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/home-mobile-390x844.png`.
  - Nested guide:
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/nested-guide-desktop-1440x1000.png`
    and
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/nested-guide-mobile-390x844.png`.
  - Code block page:
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/code-block-desktop-1440x1000.png`
    and
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/code-block-mobile-390x844.png`.
  - Flowchart page:
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/mermaid-flowchart-desktop-1440x1000.png`
    and
    `docs/exec-plans/completed/docs-fumadocs-package-separation/screenshots/mermaid-flowchart-mobile-390x844.png`.
  - Browser capture checked HTTP success, forbidden error-page text, console
    errors/warnings and page errors. The final pass had no console messages and
    no page errors.
- Verification passed:
  - `bun run --filter=docs check-types`
  - `bun run --filter=docs build`
  - `bun run --filter=@taxkit/docs-content validate`
  - `bun run verification`
  - Browser screenshot verification for `/`,
    `/guides/calculate-australian-take-home-pay`, `/start/quickstart` and
    `/start/choose-sdk-or-api` at `1440x1000` and `390x844`.
  - `rg -n "@taxkit/docs-content/server|\\.source/server" apps/docs/src || true`
  - `rg -n "switch \\(|Object\\.values|Object\\.entries| as " apps/docs/src/lib apps/docs/src/routes packages/docs-content/src/live.layer.ts packages/docs-content/src/client.ts || true`
    only reported import aliases, not casts or local DTO mirrors.
- Changeset status: no new Changeset was required for this app-internal slice;
  package-facing export/dependency changes are already covered by the
  `@taxkit/docs-fumadocs` and `@taxkit/docs-content` Changesets from
  DOCS-FUMA-001 and DOCS-FUMA-002.
- Call graph status: this slice matches the app-rendering portion of the
  target graph. The docs app now renders compiled MDX through a browser-safe
  docs-content client export and reusable docs-fumadocs render primitives.

### 2026-06-14 - DOCS-FUMA-004 implementation and parent acceptance

- Strengthened `@taxkit/docs-content` validation while keeping validation
  independent of the docs app route renderer.
- Added canonical `DocsMdxComponentName` schema ownership in
  `packages/docs-content/src/schemas.ts`.
- Added source-text validation that:
  - requires every authored MDX source to be represented in navigation;
  - keeps every navigation source existence check;
  - scans JSX-style MDX components outside fenced code blocks and inline code;
  - rejects unapproved component names through an explicit allowlist.
- Added a targeted runtime test proving inline generic text such as
  ``SdkCalculatorRunResponse<Report>`` and fenced JSX examples do not trip the
  component allowlist, while real JSX component usage does.
- Updated `packages/docs-content/README.md` and
  `docs/architecture/content-and-posts.md` to document the validation policy.
- Updated `.changeset/docs-content-fumadocs-source.md` to include the
  validation behaviour change.
- Audit pass 1, failure messages:
  - Navigation coverage issues report
    `content source missing from navigation: {source}` at the missing source.
  - Component allowlist issues report `MDX component not allowed: {name}` at
    the owning source.
- Audit pass 2, canonical schema/type reuse:
  - Frontmatter, navigation, source path, validation issue and MDX component
    names are all schema-owned in `@taxkit/docs-content`.
  - `rg -n "CalculatorRunResponse|SdkCalculatorRunResponse|Public|DTO|interface .*Request|interface .*Response|type .*Request|type .*Response" packages/docs-content/src packages/docs-content/source.config.ts || true`
    only found the stale-name validation regex and a test string used to prove
    inline code is ignored.
- Audit pass 3, helper sprawl:
  - Added reusable helpers only for named validation policies:
    navigation coverage, component policy and source-text stripping.
  - One-off error conversion remains inline in validation callsites.
- Verification passed:
  - `bun run --filter=@taxkit/docs-content validate`
  - `bun run --filter=@taxkit/docs-content test`
  - `bun run --filter=@taxkit/docs-content check-types`
  - `bun run verification`
- Call graph status: this slice matches the validation-policy portion of the
  target graph. Validation still lives in `@taxkit/docs-content` and does not
  depend on `apps/docs` route rendering.

### 2026-06-14 - DOCS-FUMA-005 implementation and parent acceptance

- Updated `docs/product-specs/docs-fumadocs-package-separation.md` to
  `status: implemented`.
- Added an implementation result section and final call graphs that match the
  implemented package split.
- Marked the old call graphs as pre-implementation evidence so readers use the
  final graphs for current architecture.
- Updated durable architecture docs:
  - `docs/architecture/content-and-posts.md` now describes `apps/docs`,
    `@taxkit/docs-content` and `@taxkit/docs-fumadocs` as implemented
    ownership layers.
  - `docs/architecture/frontend.md` now names the docs app browser-safe import
    guardrails.
  - `docs/architecture/package-boundaries.md` now uses the flat
    `packages/docs-content` and `packages/docs-fumadocs` paths.
  - `docs/architecture/api-and-sdk.md` now routes shared docs content and
    Fumadocs integration to the implemented packages.
- Updated `packages/docs-content/README.md` to remove future-runtime wording.
- Audit pass 1, reader and source of truth:
  - Architecture docs now describe durable ownership.
  - The product spec records implemented result and evidence.
  - Package READMEs keep package-local guidance.
- Audit pass 2, style:
  - Ran banned-language search over changed docs. Matches were only
    `justify/justified`, not banned hype usage.
  - Headings remain sentence case in touched docs.
- Audit pass 3, path/export accuracy:
  - Path-name search for stale nested docs package wording leaves only the
    explicit implemented-spec note that the old nested path was replaced by
    `packages/docs-fumadocs`.
  - Import graph audits returned no inappropriate browser/server or package
    boundary imports.
- Verification passed:
  - `bun run --filter=@taxkit/docs-content validate`
  - `bun run verification`
  - Import graph audit:
    `rg -n "@taxkit/docs-content/server|\\.source/server" apps/docs/src || true`
  - Import graph audit:
    `rg -n "from [\\\"']react|\\.tsx|createFileRoute|@tanstack/react-router|@tanstack/react-start" packages/docs-content --glob '!README.md' || true`
  - Import graph audit:
    `rg -n "@taxkit/docs-content|@taxkit/sdk|@taxkit/http-api|@taxkit/calculators" packages/docs-fumadocs || true`
- Changeset status: no new Changeset was required for this docs-only
  architecture/spec update. Package-facing README and validation behaviour are
  already covered by `.changeset/docs-content-fumadocs-source.md`.
- Call graph status: final call graphs in the spec match the implemented
  imports and runtime path.
