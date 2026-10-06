---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-content-owner
last_reviewed: 2026-10-07
review_trigger: content ownership, acceptance or generated presentation changes
---

# Content and posts

TaxKit public content should explain the open-source engine, supported rule
packs, calculator behaviour, API usage and SDK usage.

## Scope

This doc owns public docs/content direction for TaxKit. It should stay focused
on the open-source tax engine and avoid downstream private-product specifics.

## Main areas

`apps/docs`
: Public documentation site. It owns the TanStack Start route runtime, app
  shell, app-specific MDX component composition and browser rendering.

`packages/docs-content/content`
: Public MDX content root. It owns the Start, SDK, API, Guides, Concepts,
  Contributing and Reference section directories.

`packages/docs-content/navigation.json`
: Public docs navigation contract. It owns top-level section order, section
  source files, stable paths and primary reader metadata. It is authored,
  decoded and enforced beside the package-owned content and examples.

`packages/content`
: Private compiled owner of canonical docs page, frontmatter, navigation and
  source error contracts. Its public catalogue Schema admits published pages
  with matching navigation; its service reads that checked catalogue and limits
  search to twenty short results. It also owns both acceptance-record versions;
  the second binds the reviewed source bytes. Adding this package does not
  accept an authored draft.

`packages/docs-content`
: Private source-only package for authored navigation, meta, MDX, validation
  policy, validation errors and generated Fumadocs source access. Its existing
  page/navigation/source-error exports re-export `@taxkit/content` contracts;
  its source service still supports the existing docs app.
  Its independent native MDX index and build-only source Layer use the installed
  compiler and the same adapter as the retained Vite source.
  Its compiler-only link policy maps parsed page links through checked navigation
  and repository references to a recorded immutable revision before both HTML
  and processed Markdown are produced. It rejects unowned page destinations
  and paths outside the checkout, preserving code examples and source bytes.

`packages/docs-examples`
: Private checked integration templates and their compiler/runtime proof. It
  depends on HTTP/SDK/calculator contracts independently of the content package,
  preventing a cycle when the backend consumes content contracts. Public MDX
  references these retained templates; content validation checks those links.

`packages/docs-fumadocs`
: Private reusable package for generic Fumadocs configuration, Effect Schema to
  Standard Schema bridging, the generic source service and live/test Layers,
  and generic MDX render primitives.

`tools/documentation/owner-policy.json`
: Machine-readable separation between public content, maintainer documents,
generated artifacts, and authored SDK documentation. It validates accepted
public-status representation and navigation ownership without claiming runtime
or external availability.

`tools/documentation/catalogue.runtime.ts`
: Local accepted-catalogue build command (`bun run docs:catalogue`). It checks
version-two records and exact source hashes before and after MDX processing,
omits drafts, checks navigation through the canonical catalogue constructor,
and writes ignored `.source/public-catalogue.json` only on success. No accepted
pages is a failure. Source acceptance is recorded independently for each page
and navigation in the owner policy's exact bindings. Reviewed byte hashes
prevent a later edit from silently inheriting acceptance. The docs-content
package build includes this step, with source-review records and the compiler's
browser path in its cache inputs. Its JSON-only `./public-catalogue` export is
checked once by each API host; it imports no compiler into request handling.
HTTP and native RPC documentation groups delegate page/navigation/search and
processed Markdown to the same `ContentService`. Its compiled public-path
refinement and fixed missing-page/search errors serve both transports. The
replacement Website renders accepted pages using that private connection and
browser-safe compiled presentation. Its `/search` GET form uses the same named
accepted-catalogue search operation, showing accepted titles and descriptions
with the existing document links. No second index is added.
`ContentDiscovery` derives four discovery files from the same accepted
catalogue and the actual checked stage addresses, through one closed native
operation. The Website serves the checked XML/text body at its conventional
address. The short agent index links to accepted processed Markdown; the full
index retains those bodies, including fenced examples. No authored source,
personal report, guessed origin or competing content catalogue is exposed.
Same-page Markdown negotiation, share images and old-app retirement remain
T005 work. This implementation does not establish public availability.

`docs/architecture`
: Durable implementation architecture.

`docs/product-specs`
: Current product/spec intent for repo development.

## Public docs graph

```ts
Production: public docs request

browser
  -> apps/docs route
    -> apps/docs route boundary schema
    -> DocsContentService
      -> @taxkit/docs-fumadocs FumadocsSource
        -> packages/docs-content/.source/server
          -> packages/docs-content/content/**/*.mdx
      -> packages/docs-content/navigation.json
    -> @taxkit/docs-content/client
      -> Fumadocs compiled MDX module
    -> @taxkit/docs-fumadocs/render primitives
    -> app-local MDX component map
```

```ts
Tests: docs structure

docs implementation
  -> @taxkit/docs-content validate
    -> frontmatter and navigation schema decode
    -> navigation coverage and local link checks
    -> MDX component allowlist
    -> examples and OpenAPI reference checks
  -> bun run check:docs
  -> public/maintainer path separation and accepted status representation
    -> generated Fumadocs and OpenAPI owner edges
    -> maintainer metadata, links, commands and package README coverage
  -> @taxkit/docs-fumadocs tests
  -> apps/docs build and browser screenshots when rendering changes
  -> bun run verification
```

## Guardrails

- Keep public docs generic to callers and applications.
- Do not document private downstream product strategy here.
- Link to canonical architecture docs rather than duplicating them.
- Treat old planning material as historical until revalidated.
- Use [Documentation style](../standards/documentation-style.md) and the
  related standards suite before writing or reviewing public docs.
- Keep public MDX pages task-first. Use architecture docs for durable
  ownership and runtime detail.
- Validate public MDX through `@taxkit/docs-content`, which owns Effect Schema
  frontmatter, navigation coverage, source-text policy, local link, MDX
  component allowlist, examples and OpenAPI reference checks.
- `draft` means authored, locally renderable, visibly labelled candidate public
  documentation; it is not accepted-current truth, publication, deployment,
  external availability, correctness, or user visibility. `published` means
  explicitly accepted current public documentation; it still does not establish
  runtime or external availability. Preserve draft pages unless explicit
  page-level acceptance records their transition.
- Keep reusable Fumadocs code in `@taxkit/docs-fumadocs`; keep TaxKit
  content contracts in `@taxkit/docs-content`; keep route composition and
  app-specific rendering in `apps/docs`.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Package ownership](./package-ownership.md)
- [../product-specs/index.md](../product-specs/index.md)

## Generated collection boundary

Generated collection adapters expose named Effect operations with safe tagged
failures. The collection owner wraps synchronous loader calls and processed-text
Promise reads, preserving the SDK receiver. The reusable Fumadocs live Layer
decodes raw representations through its owning Schemas. Shiki metadata
transformation returns replacement nodes instead of mutating SDK-owned input.
