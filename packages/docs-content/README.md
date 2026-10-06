---
document_type: package-guide
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-06
review_trigger: package contracts or generated-source boundaries change
---

# @taxkit/docs-content

## Scope

Private source-only package for authored public TaxKit MDX, navigation,
and source composition. Canonical page, frontmatter, navigation and source error
contracts come from `@taxkit/content`; existing imports here re-export those
contracts for compatibility. This package owns meta and validation schemas,
validation policy, generated source configuration and `DocsContentService`. Reusable Fumadocs internals come
from `@taxkit/docs-fumadocs`.

This package does not own routes, layout, MDX renderer components or search UI.
Those belong in the `apps/docs` runtime.

## Main areas

- `content/` and `navigation.json`: the authored TaxKit public
  documentation source.
- `source.config.ts`: TaxKit collection declaration for `content/` using
  reusable `@taxkit/docs-fumadocs/config` helpers.
- `src/schemas.ts`: compatibility re-exports from `@taxkit/content` plus authored
  meta and validation issue schemas.
- `src/errors.ts`: compatibility source/lookup error exports plus validation errors.
- `src/server.ts`: server-only generated Fumadocs source loader export for the
  content collection.
- `src/navigation.ts`: deployment-neutral decoding of the bundled navigation
  representation without importing Node filesystem policy.
- `src/live.layer.ts`: Effect service layer that serves navigation and
  renderable Fumadocs page data and loads validation policy only when its
  explicit validation operation runs.
- `src/test.layer.ts`: deterministic `DocsContentService` composition over the
  generic Fumadocs test Layer.
- `src/catalogue-index.runtime.ts`: local command that asks the installed MDX
  compiler to generate an independent native index in `.source/catalogue/`.
- `src/catalogue-source.layer.ts`: local build-only compiler connection exposed
  as `@taxkit/docs-content/catalogue-source`. It waits for Bun plugin setup,
  loads that native index and uses the same generated collection adapter as
  the retained Vite source. Browser and request handlers must not import it.
- `.source/`: generated Fumadocs output. Regenerate it instead of editing it by
  hand.

## Runtime shape

`fumadocs-mdx` compiles `source.config.ts` into `.source/`. The collection root
is resolved from `source.config.ts` through its module URL because generation
also runs from the docs app working directory; generated imports remain
checkout-relative and portable in either consumer. Server-only package
code supplies one TaxKit generated-collection adapter to
`@taxkit/docs-fumadocs/live`. `DocsContentServiceLive` requires the generic
`FumadocsSource` service, decodes its generic representation into canonical
TaxKit page values and maps generic source errors at the content boundary.
The app composes the two Layers and executes the resulting server runtime.
Generic source failures are mapped once into safe TaxKit content errors; raw
provider causes and fixture content do not cross the package boundary.

The authored `navigation.json` representation is decoded through
`DocsNavigation` in `src/navigation.ts`. This keeps TaxKit navigation at its
earliest semantic owner without initializing the Node-only validation module
inside an app Worker.

This package is intentionally private and source-only. It is not a publishable
runtime package because its server and client exports wrap generated
Fumadocs/Vite modules for `content/`. The package exports include
`types`, `source` and `default` entries that all point at source files so
workspace consumers use the same generated-source boundary in development,
build and type checking.

Validation may read raw MDX source text for source-text policy checks such as
frontmatter, navigation coverage, local links, allowed MDX component usage,
examples and OpenAPI references. App routes should consume the service boundary
instead of importing `.source/*` files directly. Browser modules must not
import `@taxkit/docs-content/server`.

The generated Fumadocs loader retains a `getText("raw")` filesystem branch,
but the runtime adapter requests only `getText("processed")`. Its private
`generated-page.boundary.ts` owns the named text read, preserves the SDK method
receiver and maps rejections to a safe tagged error. Raw representations are
decoded once by the Fumadocs live Layer. The SDK offers no abort signal for
this read; interrupting its awaiting Effect does not prove provider cancellation. The validation
policy remains Node-only and is dynamically imported only by
`validateContent`. Normal docs requests must not initialize either filesystem
operation; `apps/docs` owns the isolated workerd failure oracle for that
boundary.

## Checked examples

[`@taxkit/docs-examples`](../docs-examples/README.md) owns the four source
templates and their compiler/runtime checks. Content validation checks their
existence and public references. Their HTTP/SDK dependencies do not belong in
this content package; the HTTP API can therefore consume content contracts
without a circular build graph.

The browser HTTP example accepts an explicit `URL` and calls the typed API
client through `FetchHttpClient.layer`; it has no implicit server or environment
lookup. The server example Schema-decodes the request using canonical cents and
period fields, invokes the native Effect SDK, and Schema-encodes its response.
Both export programs for an application-owned host. Tests preserve the
documented weekly pay result and reject invalid representations.

Literal money examples use `aud(Cents.make(...))`. Programs that construct
unchecked amounts use `audFromCents` and handle its typed failure channel.
The server example reuses request-decoded cents to assemble Money directly.
The corresponding public browser/server snippets match these source examples;
the money concept owns constructor and arithmetic guidance. MDX lifecycle and
navigation remain draft until their separate acceptance.

The five complete validation, raw-error, help, fact and test examples listed in
`src/validation/checked-snippets.ts` must match their compiled source files
exactly. This check applies to those named fences; it does not claim every
fenced example in the documentation has been compiled.

## Accepted catalogue build

`bun run docs:catalogue` generates both compiler indexes, then runs the
repository-owned builder in `tools/documentation/catalogue.runtime.ts`.
The retained Mermaid compiler uses Chromium. Use the repository's configured
`PLAYWRIGHT_BROWSERS_PATH`, as the Quality workflow does, when browsers are
stored outside Playwright's default location.
The MDX compiler owns frontmatter and processed Markdown. The builder reads
the exact acceptance bindings in `tools/documentation/owner-policy.json` and
requires version-two records with the reviewed source's SHA-256 hash. It
checks the bytes before loading the compiler and again before writing output.
Relative paths and their resolved files must stay inside the checkout.

Published pages need matching accepted navigation. Drafts are omitted, and
an accepted child cannot be hidden under a draft section page. The canonical
`DocsPublicCatalogue` constructor checks page addresses, sources, titles and
navigation coverage. No accepted pages is an error; it cannot silently create
an empty public site. Successful builds encode the checked catalogue once to
`.source/public-catalogue.json`. That generated file is local build output,
not publication or deployment evidence.

Version-one acceptance records remain readable by the regular docs checker
for their retained lifecycle evidence. The new catalogue builder requires
version two. Adding a record must follow page review; generating an index
does not accept its authored pages. All current authored pages remain drafts.

## Frontmatter contract

Every authored MDX page under `packages/docs-content/content` must provide:

- `title`
- `description`
- `status`

The schema source of truth is `DocsPageFrontmatter` in `src/schemas.ts`.
Fumadocs receives that schema through `Schema.toStandardSchemaV1(...)`, so the
Effect Schema contract remains canonical while Fumadocs performs frontmatter
validation.

`DocsContentStatus` owns the allowed representation values. HGI-207 defines
`draft` as authored, locally renderable, visibly labelled candidate content and
`published` as explicitly accepted current public documentation. Neither this
package nor `bun run check:docs` may infer publication, deployment, runtime or
external availability, correctness, or user visibility from either value.

## Validation policy

`bun run --filter=@taxkit/docs-content validate` checks:

- navigation JSON decodes through `DocsNavigation`;
- every navigation source exists;
- every authored MDX source is represented in navigation;
- every page frontmatter decodes through `DocsPageFrontmatter`;
- local relative links resolve;
- fenced code blocks are balanced;
- banned marketing language, stale public names and private downstream product
  details are absent;
- JSX-style MDX components outside inline code and fenced code blocks are in the
  explicit allowed component set;
- examples and OpenAPI reference pages include their required reference text.

Add new MDX component allowances in `src/validation/policy.ts` only when the
component is intentionally supported by the docs app renderer. Keep renderer
implementation in `apps/docs` or reusable primitives in
`@taxkit/docs-fumadocs/render`.

## Guardrails

- Keep authored content in `packages/docs-content/content`.
- Keep generated source behind `@taxkit/docs-content`.
- Do not import `packages/docs-content/.source/*` from browser/runtime code.
- Do not add app routes, layout, renderer components or search behavior here.
- Keep generic MDX options, Standard Schema bridging, source loader adapters
  and reusable renderer primitives in `@taxkit/docs-fumadocs`.
- Regenerate `.source/` with `bun run --filter=@taxkit/docs-content build`
  after changing content, `source.config.ts` or schema fields that affect
  generated source. The named lower-level command is
  `bun run --filter=@taxkit/docs-content generate`; the package build executes
  it, and Turbo records its inputs, `.source/**` output and upstream
  docs-fumadocs build.
- Run `bun run --filter=@taxkit/docs-examples check-examples` after changing
  the checked source templates.
- Keep docs identifiers, frontmatter, meta, navigation and tagged source errors
  schema-owned in this package.
- Keep service tests on the deterministic test Layer so accepted, missing and
  malformed content exercise the same canonical service contract as
  production.

## Related docs

- `docs/product-specs/docs-mdx-fumadocs-runtime.md`
- `docs/architecture/content-and-posts.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/testing-and-quality.md`


The Effect and browser HTTP templates construct the calculator-owned request
Options. Their matching public guides explain the checked TypeScript values;
raw HTTP JSON examples retain ordinary optional fields. The docs-examples
compiler checks both canonical templates. Content validation checks their
public references.


The error reference distinguishes checked Core diagnostic absence from its
retained encoded forms and does not treat opaque diagnostics as safe telemetry.
Content lifecycle and navigation acceptance remain unchanged.
