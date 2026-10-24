---
document_type: product-spec
lifecycle: active
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-24
review_trigger: effect-mdx public surface, block vocabulary or package boundary changes
---

# effect-mdx: one domain-free package for authored MDX

Task list: [`effect-mdx.tasks.json`](./effect-mdx.tasks.json).

## 1. Overview

TaxKit turns authored `.mdx` files into a checked, serialisable reading body,
served by the API, MCP, processed Markdown and the Website. The pipeline works,
but its generic parts are spread across three packages that all depend on the
TaxKit publication package, and two hosts compose it by hand.

This SPEC extracts the authored-format work (reading, checking, linking,
highlighting, diagrams, Markdown output and React rendering) into one
domain-free package, `@taxkit/effect-mdx`. `@taxkit/content` keeps only TaxKit
publication policy. The MDX parser and the strict "no JSX" rule stay.

## 2. Problem

Evidence from current code:

- **The dependency arrow points the wrong way.** `@taxkit/mdx` and
  `@taxkit/diagrams` import contracts from `@taxkit/content`
  (`packages/mdx/src/live.layer.ts`, `packages/diagrams/src/mermaid.adapter.layer.ts`).
  The generic parser depends on the TaxKit publication package.
- **Generic Schemas carry TaxKit facts.** `packages/content/src/schemas.ts`
  mixes the reading body (blocks, inlines, tokens, diagrams) with TaxKit page
  types, reader roles, `contentRoot: "content/docs"`, a fixed code-language list
  and `taxkit/*` brands.
- **Link policy is hard-coded.** `packages/content/src/links.ts` fixes
  `content/docs` as the root and special-cases `packages/docs-examples/`.
- **A seam with one adapter.** `DocsPageReader` (`packages/content/src/service.ts`)
  has one implementation and no test adapter.
- **Composition is duplicated and differs.** `apps/api/scripts/docs-catalogue.layer.ts`
  loads sources from the 62 `?raw` imports in `content/docs/sources.ts`, while
  `apps/web/scripts/docs-images.build.ts` reads the files from disk by walking
  `navigation.json`. Both wire reader, highlighter and renderer by hand.
- **Adding a page touches three files**: the `.mdx`, `navigation.json` and
  `sources.ts` (`content/docs/README.md`).
- **The renderer is locked in the app.** `apps/web/src/lib/docs/reading-body.view.tsx`
  is generic apart from its TanStack `Link`.
- **Errors stop at the first page** and carry no line number.

## 3. Call graphs

```ts
Build: current

apps/api/scripts/docs-catalogue.runtime.ts
  -> DocsCatalogueBuildLive (apps/api/scripts/docs-catalogue.layer.ts)
    -> DocsSources <- @content/docs/sources (62 ?raw imports)
    -> ContentCatalogueLive (@taxkit/content/live)
      -> navigation.json, repository.json (static imports)
      -> DocsPageReader (@taxkit/mdx/live)
        -> readMdx (YAML + micromark) -> readBody
          -> resolveDocsHref (@taxkit/content/links)
          -> DocsCodeHighlighter (@taxkit/mdx/highlights)
          -> DocsDiagramRenderer (@taxkit/diagrams/mermaid)
      -> readingMarkdown (@taxkit/content)
  -> apps/api/src/generated/docs-catalogue.json

apps/web/scripts/docs-images.build.ts
  -> its own DocsSources from navigation.json + FileSystem
  -> the same ContentCatalogueLive + reader + highlighter + renderer wiring
```

```ts
Build: target

apps/api/scripts/docs-catalogue.runtime.ts | apps/web/scripts/docs-images.build.ts | apps/api/test
  -> DocsCatalogueBuildLive (@taxkit/content/build)   // the one composition
    -> readSources(contentRoot) (@taxkit/effect-mdx/sources, FileSystem + Path)
    -> compileCollection({ sources, frontmatter: DocsPageFrontmatter })
         (@taxkit/effect-mdx/compile)
      -> MdxCodeHighlighter  <- MdxCodeHighlighterLive (@taxkit/effect-mdx/highlights)
      -> MdxDiagramRenderer  <- MdxDiagramRendererLive (@taxkit/effect-mdx/mermaid)
                                  <- MdxDiagramTheme (TaxKit palette, Layer.succeed)
      -> MdxFileLinks        <- DocsRepositoryFileLinksLive (@taxkit/content, repository.json)
    -> toMarkdown (@taxkit/effect-mdx/markdown)
    -> TaxKit publication policy: navigation order, drafts, section rule
  -> apps/api/src/generated/docs-catalogue.json   // byte-identical to today
```

```ts
Serve and render: target (unchanged transport)

Website route loader -> generated HttpApiClient -> API content routes
  -> ContentService -> ContentCatalogue (decoded JSON)
Website page
  -> MdxBodyView (@taxkit/effect-mdx/react)
       components={{ link: DocsRouterLink }}   // the app's only override
```

```ts
Tests: target

@taxkit/effect-mdx tests
  -> compileCollection with MdxCodeHighlighterTest, MdxDiagramRendererTest, MdxFileLinksTest
  -> live adapters against real pierre and beautiful-mermaid
@taxkit/content tests
  -> publication policy over fixture MdxCollection values
apps/api/test/docs-sources.test.ts
  -> DocsCatalogueBuildLive with NodeServices over content/docs
```

## 4. Goals

1. One domain-free package that owns the authored format end to end and
   imports no `@taxkit/*` package.
2. A small public surface: one compile function, three adapter contracts, one
   Markdown writer, one source reader, one React view.
3. `@taxkit/content` keeps only TaxKit policy: frontmatter fields, navigation
   order, publication rules, repository links, search, origins and the service.
4. One build composition shared by the API build, the Website image build and
   tests.
5. Adding a page means adding the `.mdx` file and its navigation entry, with no
   `sources.ts`.
6. Every step leaves the generated catalogue and the OpenAPI snapshot
   byte-identical.

## 5. Non-goals

- Changing the parser or adopting Markdoc or Blume.
- Allowing JSX, images or raw HTML.
- New block kinds (callouts, tabs, steps). Section 7.7 says where they will go.
- Moving `pageType` and `primaryReader` from `navigation.json` into frontmatter.
- Publishing `@taxkit/effect-mdx` to npm. It stays private, but has no TaxKit
  imports, so publishing later means a rename and an export audit.
- Changing search, HTTP routes, MCP tools, discovery files or Website styling.

## 6. Ownership and boundaries

| Owner | Owns after this work |
| --- | --- |
| `packages/effect-mdx` (new, private, compiled) | Authored-format Schemas, errors, adapter contracts, `compileCollection`, `toMarkdown`, `readSources`, pierre and Mermaid adapters, test adapters, `MdxBodyView` |
| `packages/content` | TaxKit frontmatter, navigation, public catalogue, repository-file links adapter, diagram palette, `DocsCatalogueBuildLive`, `ContentService`, search, origins |
| `content/docs` | Authored `.mdx`, `navigation.json`, `repository.json`, and the content root. `sources.ts` is deleted |
| `apps/web` | The TanStack link override and page chrome |
| `packages/mdx`, `packages/diagrams` | Deleted; their code moves into `effect-mdx` |

Dependency direction: `effect-mdx` ← `content` ← `api-http`, `api-mcp`,
`publication`, apps. `packages/effect-mdx` joins `domainFreeOwners` in
`tools/oxlint/package-roles.ts`, so any `@taxkit/*` dependency fails lint.

Durable rules stay with their owners:
[`content-and-posts.md`](../architecture/content-and-posts.md),
[`effect-services.md`](../architecture/effect-services.md) and
[`package-ownership.md`](../architecture/package-ownership.md).

## 7. Proposed approach

### 7.1 Design decisions

| # | Decision | Why |
| --- | --- | --- |
| D1 | One package with subpath exports, not three packages | The reader, highlighter and renderer share one contract set and change together. Subpaths keep provider code out of browser and Worker bundles |
| D2 | `Mdx*` names the authored format; `Docs*` names TaxKit publication | A reader can tell from the name which package owns it. No re-exports across the two |
| D3 | One deep entry point, `compileCollection`; `DocsPageReader` is removed | Its one adapter made it a hypothetical seam. Callers learn one function; parsing, checking and linking stay inside |
| D4 | Exactly three seams: `MdxCodeHighlighter`, `MdxDiagramRenderer`, `MdxFileLinks` | Each has a live and a test adapter, and the link policy differs per site. Two adapters make a real seam |
| D5 | Frontmatter is the caller's Schema; the package requires only `title` | Sites differ in metadata. The package checks that the `#` heading equals `title` and nothing else |
| D6 | Compile a collection, not a page | Links resolve across documents, and duplicate addresses are caught once |
| D7 | Addresses come from file paths: `a/index.mdx` → `/a`, `a/b.mdx` → `/a/b` | Today `DocsPublicPage` already enforces this rule, so the duplicated `path` and `source` fields in navigation become derivable |
| D8 | The block vocabulary is closed and grows only in `effect-mdx` | Every consumer (React view, Markdown writer, search, MCP) matches exhaustively, so a new block fails type checks until each consumer handles it |
| D9 | Adapter settings are Context inputs supplied with `Layer.succeed` (for example `MdxDiagramTheme`) | Follows the static-Layer rule: no Layer factories, and site colours stay with the site |
| D10 | Heavy adapters run at build time only; `./schemas` stays browser-safe | Matches today's Worker decode-only model in `apps/api/src/content.boundary.ts` |
| D11 | One error class, `MdxSourceError`, with a closed `reason` and an optional line | Callers can Match on reason; authors see where the problem is |
| D12 | The React view takes a typed `components` map keyed by block and inline kind | The only customisation point. Types come from the Schemas, so an override cannot drift from the data |

### 7.2 Public surface

| Export | Contents | Runtime |
| --- | --- | --- |
| `./schemas` | `MdxSourcePath`, `MdxSource`, `MdxDocumentPath`, `MdxSlug`, `MdxHeadingId`, `MdxHref`, `MdxCodeLanguage`, `MdxCodeToken`, `MdxCodeLines`, `MdxDiagramTitle`, `MdxDiagramSource`, `MdxDiagramSvg`, `MdxInline`, `MdxBlock`, `MdxBody`, `MdxFrontmatterBase`, and the Schema constructors `MdxDocument(frontmatter)` and `MdxCollection(frontmatter)` | Browser-safe |
| `./errors` | `MdxSourceError`, `MdxCodeHighlightError`, `MdxDiagramRenderError`, `MdxFileLinkError` | Browser-safe |
| `./service` | Contracts only: `MdxCodeHighlighter`, `MdxDiagramRenderer`, `MdxFileLinks`, `MdxDiagramTheme` | Browser-safe |
| `./compile` | `compileCollection` | Build |
| `./markdown` | `toMarkdown(document)` (moved from `reading-markdown.egress.ts`) | Any |
| `./sources` | `readSources(root)` over Effect `FileSystem` and `Path` | Build |
| `./highlights` | `MdxCodeHighlighterLive` (only `@pierre/highlights` caller) | Build |
| `./mermaid` | `MdxDiagramRendererLive` (only `beautiful-mermaid` caller; requires `MdxDiagramTheme`) | Build |
| `./links` | `MdxFileLinksNone`: every non-document relative link fails | Any |
| `./test` | `MdxCodeHighlighterTest`, `MdxDiagramRendererTest`, `MdxFileLinksTest` | Tests |
| `./react` | `MdxBodyView`, `MdxComponents` (React is a peer dependency) | Browser |

Signatures (exact types are fixed against installed `effect` 4.0.4):

```ts
// ./compile
export const compileCollection: <F extends MdxFrontmatterBase>(input: {
  readonly sources: ReadonlyArray<MdxSource>; // order is kept
  readonly frontmatter: Schema.Decoder<F>;
}) => Effect.Effect<
  MdxCollection<F>,
  MdxSourceError,
  MdxCodeHighlighter | MdxDiagramRenderer | MdxFileLinks
>;

// ./service
class MdxFileLinks extends Context.Service<MdxFileLinks, {
  // `target` is normalised and relative to the collection root; it may start with "../"
  readonly resolve: (link: {
    readonly from: MdxSourcePath;
    readonly target: string;
    readonly fragment: Option.Option<MdxHeadingId>;
  }) => Effect.Effect<MdxHref, MdxFileLinkError>;
}>()("effect-mdx/MdxFileLinks") {}

// ./react
export type MdxComponents = {
  readonly [K in MdxBlock["kind"] | MdxInline["kind"]]: React.FC<
    Extract<MdxBlock | MdxInline, { kind: K }>
  >;
};
export const MdxBodyView: React.FC<{
  readonly body: MdxBody;
  readonly components?: Partial<MdxComponents>;
}>;
```

A document is `{ source, path, slugs, title, frontmatter: F, body }`. The
collection is `{ documents }` in source order. The package adds no
`schemaVersion` and no publication status; `DocsPublicCatalogue` keeps both.

### 7.3 Inside `compileCollection`

Flat and sequential: decode each source (YAML with `uniqueKeys` and no aliases,
then the caller's frontmatter Schema with excess properties rejected, then the
micromark tree through the checked `Syntax*` Schemas) → derive addresses and
reject duplicates → build the source-to-address `HashMap` → read each body
(links, highlighting, diagrams) → check the title against `#` and that heading
ids are unique → decode `MdxCollection(frontmatter)`.

Link rules (generic): HTTPS and same-page fragments pass; a relative `.mdx`
link becomes the target document's address plus fragment, and an unknown
document fails; any other relative link goes to `MdxFileLinks`; other schemes
and absolute paths fail.

### 7.4 What `@taxkit/content` becomes

- `schemas.ts`: `DocsPageFrontmatter` (`title`, `description`, `status`),
  navigation, `DocsPublicPage = MdxDocument(DocsPublishedFrontmatter)` plus
  `markdown`, `DocsPublicCatalogue`, search Schemas, origins. Block and inline
  Schemas are removed from here; consumers import them from
  `@taxkit/effect-mdx/schemas`.
- `links.layer.ts`: `DocsRepositoryFileLinksLive` implements `MdxFileLinks`
  from `repository.json`, including the `packages/docs-examples/` revision rule.
- `build.layer.ts` (new `./build` export): `DocsCatalogueBuildLive`, the one
  composition, requiring only `FileSystem | Path`. It supplies the highlighter,
  the renderer with the Website palette as `MdxDiagramTheme`, and repository
  links.
- `live.layer.ts`: `ContentCatalogueLive` applies navigation order, drafts and
  the section rule to the compiled collection. `ContentServiceLive` is unchanged.
- `service.ts`: drops `DocsPageReader`, `DocsCodeHighlighter`,
  `DocsDiagramRenderer` and `DocsSources`.

### 7.5 Source discovery

`readSources(root)` returns every `*.mdx` file under `root` as `MdxSource`,
sorted by path. The API build has run on Bun with a filesystem since the
catalogue moved ahead of time, so `?raw` imports are no longer needed.
`ContentCatalogueLive` still fails when the files and `navigation.json`
disagree. `content/docs` exports its root directory as a file URL.

### 7.6 Authoring feedback (later task)

`compileCollection` reports every broken source in one failure, with the line
from the mdast `position`, and checks `#fragment` links against the target
document's heading ids. This changes no output for valid content.

### 7.7 Future blocks

Callouts, steps and tabs will be MDX container directives (`:::note`), added to
`MdxBlock` with their Syntax Schema, React default and Markdown writer in the
same change. JSX remains rejected.

## 8. Tests and verification

- Byte identity, from the base commit and after every task: build the catalogue
  and `cmp` it against the baseline; `git diff --exit-code packages/api/http/__snapshots__/openapi.json`.
- `@taxkit/effect-mdx`: every `MdxSourceError` reason, each link rule, address
  derivation and duplicates, frontmatter excess keys, live adapters against real
  providers, test adapters through the same contracts, and `toMarkdown` round
  trips (moved from `packages/content/test/reading.test.ts` and
  `packages/mdx/test/*`).
- `@taxkit/content`: publication policy over fixture collections, and
  repository links, including the docs-examples revision.
- `apps/api/test/docs-sources.test.ts` uses `DocsCatalogueBuildLive` and
  `readSources` instead of `docsSources`.
- Website: browser proof that a docs page with a table, code, a diagram and
  page and fragment links renders the same and navigates client-side.
- Negative audits: `rg "@taxkit/" packages/effect-mdx/src` is empty;
  `rg "@pierre/highlights|beautiful-mermaid" --glob '!packages/effect-mdx/**'`
  is empty; `rg "DocsPageReader|content/docs/sources"` is empty.
- `bun run verification`.

## 9. Risks and tradeoffs

- **Generic frontmatter adds type parameters.** Kept to one parameter on
  `compileCollection`, `MdxDocument` and `MdxCollection`.
- **Renaming many Schemas touches many imports.** Wire JSON and OpenAPI stay
  identical, and the byte gate catches drift.
- **Folding `@taxkit/diagrams` into `effect-mdx` adds provider dependencies** to
  one package. Subpath exports and package-role lint keep them out of browser
  and Worker code.
- **The React view has one consumer today.** It is the last task, and moves
  code rather than adding new code.

## 10. Versioning and changelog impact

Private packages are versioned (`.changeset/config.json`,
`privatePackages.version: true`). Changesets:

- `@taxkit/effect-mdx`: new package, `0.1.0`.
- `@taxkit/content`: major. It removes `DocsPageReader`, `DocsSources`, the
  highlighter and renderer contracts and the block Schemas, and adds `./build`.
- `api` and `web`: patch (dependency changes only).

`@taxkit/mdx` and `@taxkit/diagrams` are deleted. The public `taxkit` package,
the HTTP wire and OpenAPI do not change.

## 11. Downstream impact ledger

| Surface | Status | Evidence | Task |
| --- | --- | --- | --- |
| Architecture docs | Change required | `docs/architecture/content-and-posts.md`, `effect-services.md` (~L204), `package-ownership.md` (L25–35, L166–196), `api-and-sdk.md` (L540) | TASK-006 |
| Root and package READMEs | Change required | `README.md` (L22, L63–65), `packages/content/README.md`, `apps/api/README.md` (L29), `content/docs/README.md`, `docs/README.md` (L31); new `packages/effect-mdx/README.md` | TASK-001, 003, 006 |
| Lint config and rules | Change required | `oxlint.config.ts` (L66–72 ingress list), `tools/oxlint/portable-rules.test.ts` (L449–468), `tools/oxlint/package-roles.ts` (frontend modules, `domainFreeOwners`) | TASK-001, 002, 005 |
| Knip | Change required | `knip.json` (L161–170), `knip.production.json` (L173–177) | TASK-002 |
| Workspace dependency test | Change required | `tools/workspace/dependencies.boundary.test.ts` | TASK-001 |
| Manifests and exports | Change required | `apps/api/package.json` (L45–46), `apps/web/package.json` (L47–49), `packages/content/package.json` | TASK-001, 002 |
| Composition sites | Change required | `apps/api/scripts/docs-catalogue.layer.ts`, `apps/web/scripts/docs-images.build.ts` | TASK-002 |
| Source list | Change required | `content/docs/sources.ts`, `raw-modules.d.ts`; users in `apps/api/test/docs-sources.test.ts` and `packages/docs-examples/test/published-snippets.test.ts` | TASK-003 |
| Content consumers | Change required | `apps/web/src/lib/docs/*.tsx`, `packages/api/mcp/src/schemas.ts`, `packages/publication/src/*` (block Schema imports) | TASK-001 |
| HTTP/OpenAPI | N/A (gated) | `packages/api/http/__snapshots__/openapi.json`; the content Schemas carry no identifiers, so the components do not change | Gate in every task |
| SDK | N/A | `packages/sdk/typescript` uses `@taxkit/content` only in `src/http-parity.test.ts`; its exports are unchanged | — |
| Frontend composition | Change required | `apps/web/src/lib/docs/reading-body.view.tsx` → `MdxBodyView` with a link override; the route → container → leaf structure is unchanged | TASK-005 |
| Skills and `AGENTS.md` | N/A | No skill names these packages (`rg -l "taxkit/mdx" .agents` is empty) | — |
| Deployment and runbooks | N/A | The Worker still decodes the generated JSON; there is no new binding or command | — |
| Changesets | Change required | Section 10 | TASK-006 |

## 12. Acceptance criteria

- `packages/effect-mdx` exists with the exports in 7.2 and no `@taxkit/*`
  import, and lint enforces this.
- `packages/mdx`, `packages/diagrams`, `content/docs/sources.ts` and
  `DocsPageReader` are gone.
- The API build, the Website image build and the API tests use
  `DocsCatalogueBuildLive`.
- The generated catalogue and the OpenAPI snapshot are byte-identical to the
  base commit.
- The Website renders docs through `MdxBodyView`, with browser proof.
- Architecture docs and READMEs describe the result; this SPEC and its task
  list are deleted in the closing change.
- `bun run verification` passes.

## 13. References

- [Content and posts](../architecture/content-and-posts.md)
- [Effect services](../architecture/effect-services.md)
- [Package ownership](../architecture/package-ownership.md)
- [Writing specs](./writing-specs.md)
