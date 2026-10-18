---
document_type: package-guide
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-18
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
Those belong in the current consuming `apps/web` Website. The retired old
app is no longer a workspace; its original source remains historical data.

## Main areas

- `content/` and `navigation.json`: the authored TaxKit public
  documentation source.
- `source.config.ts`: TaxKit collection declaration for `content/` using
  reusable `@taxkit/docs-fumadocs/config` helpers. It checks imported navigation
  once at the synchronous compiler configuration boundary.
- `src/public-links.boundary.ts`: compiler-only mapping of parsed page and
  repository links. It preserves the supplied tree and code examples.
- `src/public-links.schema.ts` and `src/public-links.profile.ts`: checked
  repository URL, historical citation revision and accepted current-example
  snapshot used by the compiler for source attribution.
- `src/schemas.ts`: compatibility re-exports from `@taxkit/content` plus authored
  meta and validation issue schemas.
- `src/errors.ts`: compatibility source/lookup error exports plus validation errors.
- `src/server.ts`: private generated Fumadocs loader used to derive compiler
  adapter types. It has no public package subpath.
- `src/navigation.ts`: deployment-neutral decoding of the bundled navigation
  representation without importing Node filesystem policy.
- `src/live.layer.ts`: build-time source service Layer exposing only
  `listPages` and `getNavigation` for catalogue preparation.
- `src/test.layer.ts`: static `DocsContentServiceTest` composition over the
  generic Fumadocs test Layer; tests supply `FumadocsSourceFixtures`.
- `src/catalogue-index.runtime.ts`: local command that asks the installed MDX
  compiler to generate an independent native index in `.source/catalogue/`.
- `src/catalogue-source.layer.ts`: local build-only compiler connection exposed
  as `@taxkit/docs-content/catalogue-source`. It waits for Bun plugin setup,
  loads that native index and supplies the checked generated-collection adapter.
  Browser and request handlers must not import it.
- `.source/`: generated Fumadocs output. Regenerate it instead of editing it by
  hand.

## Runtime shape

`fumadocs-mdx` compiles `source.config.ts` into `.source/`. The collection root
is resolved from `source.config.ts` through its module URL because generation
also runs from the Website working directory; generated imports remain
checkout-relative and portable in either consumer. Server-only package
code supplies one TaxKit generated-collection adapter as
`FumadocsGeneratedCollection` to the static `FumadocsSourceLive`. `DocsContentServiceLive` requires the generic
`FumadocsSource` service, decodes its generic representation into canonical
TaxKit page values and maps generic source errors at the content boundary.
The catalogue command composes these Layers. Public requests use
`@taxkit/content` over the checked JSON catalogue.
Generic source failures are mapped once into safe TaxKit content errors; raw
provider causes and fixture content do not cross the package boundary.

The authored `navigation.json` representation is decoded through
`DocsNavigation` in `src/navigation.ts`. This keeps TaxKit navigation at its
earliest semantic owner without initializing the Node-only validation module
inside an app Worker.

The compiler also checks imported navigation in `source.config.ts`. Its
synchronous configuration host uses the non-throwing Schema result and turns an
invalid result into a fixed safe configuration failure. It does not run an
Effect runtime. Every local runtime import in the Node-loaded configuration
closure uses an explicit `.ts` source specifier; it cannot rely on Bun or a test
resolver mapping `.js` to source. A native Node config-import regression checks
that boundary without generation or a custom loader. Fumadocs owns parsing,
highlighting and both HTML and processed Markdown. The private link plugin maps its parsed link and reference-definition
nodes through checked navigation. Section indexes use their canonical section
address. Repository references use the recorded immutable Git revision; queries
and fragments survive. Anchors and external links are preserved, and code
examples are not rewritten. Current checked-example targets use a separate
accepted immutable revision; ordinary repository citations retain their
historical revision. Unknown page addresses and paths outside the checkout
reject compilation. Refresh the accepted example revision only at a recorded
review phase after comparing the selected Git objects with the checked files.
Both standalone validation and catalogue publication require exact source-byte
equality. The catalogue command also checks the emitted complete guide fences
and example-reference URLs before writing its JSON. The accepted Git objects
must be available locally; the check never fetches them.

The same plugin serves the retained Vite index and the independent native index.
It belongs to the build process; browser modules and request handlers must not
import its Node path operations or the compiler configuration.

Node's native configuration loader requires `with { type: "json" }` on the
navigation import. This source-only package and the documentation tool typecheck select `ESNext` modules so the
installed TypeScript compiler accepts that declaration. The root module setting
and compiled public package settings retain their existing contract.

This package is intentionally private and source-only. It is not a publishable
runtime package because its client export wraps generated Fumadocs/Vite
modules for `content/`. The retired `./server`, `./generated-source` and
executable `./validate` imports are absent. Validation remains a package command. The package exports include
`types`, `source` and `default` entries that all point at source files so
workspace consumers use the same generated-source boundary in development,
build and type checking.

Validation may read raw MDX source text for source-text policy checks such as
frontmatter, navigation coverage, local links, allowed MDX component usage,
examples and OpenAPI references. MDX syntax and component classification use
the installed MDX parser; the compiler runs the same component policy on its
existing tree. App routes consume the public Content service. Browser modules
use only the supported `./client` presentation entry.

The generated Fumadocs loader retains a `getText("raw")` filesystem branch,
but the runtime adapter requests only `getText("processed")`. Its private
`generated-page.boundary.ts` owns the named text read, preserves the SDK method
receiver and maps rejections to a safe tagged error. Raw representations are
decoded once by the Fumadocs live Layer. The SDK offers no abort signal for
this read; interrupting its awaiting Effect does not prove provider cancellation. The validation
policy remains local-command-only through `src/validate.runtime.ts`.
The source service has no page lookup or validation operation. Normal docs
requests must not initialize source acquisition or validation. The original old-app failure oracle remains retained-source
history. Current API/Website native tests cover the public catalogue at runtime.

## Checked examples

[`@taxkit/docs-examples`](../docs-examples/README.md) owns the checked source
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

The OpenAPI guide links to the checked API snapshot and its regeneration test.
Content validation requires that source pointer and command beside the live
document path, calculate path and request schema. The content build does not
need a running API. Both the validation-error and type-safety guides copy the
same complete external-input example; validation checks each copy.

Literal money examples use `aud(Cents.make(...))`. Programs that construct
unchecked amounts use `audFromCents` and handle its typed failure channel.
The server example reuses request-decoded cents to assemble Money directly.
The corresponding public browser/server snippets match these source examples;
the money concept owns constructor and arithmetic guidance.

The complete browser, validation, raw-error, help, fact and test examples listed
in `src/validation/checked-snippets.ts` must match their checked source files
exactly. The example registry also owns which repository links promise the
current checked source snapshot. This check applies to those named fences; it does not claim every
fenced example in the documentation has been compiled.

## Public catalogue build

`bun run --filter=@taxkit/docs-content build` generates both compiler indexes,
then runs `src/catalogue.runtime.ts`. `generate` remains the lower-level
compiler-index command. The Turbo build task hashes the package sources and
takes `PLAYWRIGHT_BROWSERS_PATH` as an environment input because Mermaid
rendering uses Chromium. Use the repository's configured
`PLAYWRIGHT_BROWSERS_PATH`, as the Checks workflow does, when browsers are
stored outside Playwright's default location. A fresh host must first install
the matching browser and system libraries with
`apps/web/node_modules/.bin/playwright install --with-deps chromium` from the
repository root. This prerequisite also applies when Preview cleanup builds
only the catalogue dependency closure: Mermaid rendering occurs while reading
processed page Markdown, before any provider command. Build failures retain
the safe source-error boundary; missing Chromium must be corrected at host setup.
The MDX compiler owns frontmatter and processed Markdown.

Page frontmatter and `navigation.json` decide publication.
`src/catalogue.policy.ts` keeps pages whose `status` is `published` and
requires published navigation. Drafts are omitted, and a published child
cannot be hidden under a draft section page. The canonical
`DocsPublicCatalogue` constructor checks page addresses, sources, titles and
navigation coverage. No published pages is an error; it cannot silently create
an empty public site. Successful builds encode the checked catalogue once to
`.source/public-catalogue.json`. That generated file is local build output,
not publication or deployment evidence.
`./public-catalogue` exports only that JSON value. The API host imports it at
composition time and checks it with `@taxkit/content`; this export does not
import compiler, filesystem, React or authored-source Layers.

To publish a page, change its frontmatter `status` to `published` in an
ordinary pull request. A published status establishes neither public routes
nor external availability.

## Frontmatter contract

Every authored MDX page under `packages/docs-content/content` must provide:

- `title`
- `description`
- `status`

The schema source of truth is `DocsPageFrontmatter` in `src/schemas.ts`.
Fumadocs receives that schema through `Schema.toStandardSchemaV1(...)`, so the
Effect Schema contract remains canonical while Fumadocs performs frontmatter
validation.

`DocsContentStatus` owns the allowed representation values. `draft` is
authored, locally renderable, visibly labelled candidate content; `published`
puts the page in the public catalogue. Neither value establishes deployment,
runtime or external availability, correctness, or user visibility.

## Validation policy

`bun run --filter=@taxkit/docs-content validate` checks:

- navigation JSON decodes through `DocsNavigation`;
- every navigation source exists;
- every authored MDX source is represented in navigation;
- every page frontmatter decodes through `DocsPageFrontmatter`;
- local relative links resolve;
- MDX parses successfully through the compiler's installed parser;
- banned marketing language, stale public names and private downstream product
  details are absent;
- JSX-style MDX components outside inline code and fenced code blocks are in the
  explicit allowed component set;
- examples and OpenAPI reference pages include their required reference text;
- every current checked example exactly matches its accepted immutable Git object.

Add new MDX component allowances in `src/validation/mdx-component-policy.ts`
only when the component is intentionally supported by the Website renderer.
Backtick and tilde fences, longer fence delimiters and inline-code delimiters
are classified by the MDX AST, independently of the allowlist. The same policy
visits parser-owned ESTree Programs for JavaScript expressions, ESM and JSX
attribute payloads. Executable JSX in those Programs follows the component
allowlist, including member bindings such as `motion.div` and
`components.Unsafe` with lowercase namespace roots. Plain lowercase intrinsic
HTML tags remain supported; strings and template text remain literal. The native ESTree visitor
uses a fresh VFile diagnostic sink for each traversal and does not mutate the AST. Keep renderer
implementation in the consuming app or reusable primitives in
`@taxkit/docs-fumadocs/render`.

## Guardrails

- Keep authored content in `packages/docs-content/content`.
- Keep generated source behind `@taxkit/docs-content`.
- Do not import `packages/docs-content/.source/*` from browser/runtime code.
- Do not add app routes, layout, renderer components or search behavior here.
- Keep generic MDX options, Standard Schema bridging, source loader adapters
  and reusable renderer primitives in `@taxkit/docs-fumadocs`.
- Regenerate `.source/` with `bun x turbo run build --filter=@taxkit/docs-content`
  after changing content, `source.config.ts` or schema fields that affect
  generated source. The named lower-level command is
  `bun x turbo run generate --filter=@taxkit/docs-content`; the package build
  executes its generation leaf, and Turbo records its inputs, `.source/**`
  output and upstream docs-fumadocs build. Tests and types also use the
  filtered Turbo task when dependency artifacts have not been prepared.
  Leaf commands never rebuild another package while it is in use.
- Run `bun run --filter=@taxkit/docs-examples check-examples` after changing
  the checked source templates.
- Keep canonical identifiers, frontmatter, navigation and source errors owned
  by `@taxkit/content`; authored meta and validation contracts remain here.
- Keep build-source tests on the deterministic test Layer so decoded pages,
  navigation and malformed representations exercise the catalogue source contract.
  Public lookup and missing-page behavior belong to `@taxkit/content`.

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
Page and navigation publication status remain unchanged.

The replacement Website also consumes `./client` through the matching MDX Vite
plugin and this package's collection configuration. Its server obtains checked
page/navigation values from the separate API; the browser-safe compiled page
must match that API value before display. The Website owns routes, rendering,
focus, responsive navigation and recoverable errors. This adds no authored
source, compiler or filesystem fallback to its request handlers. The old docs app is retired.

The Website also generates static PNG share assets from this checked catalogue
at its Vite build boundary. Publication status and authored sources remain owned
here; rendering, the image-address mapping, page metadata and build-only Takumi
renderer belong to [the Website](../../apps/web/README.md). Its renderer consumes
only checked public title, description and path. It does not add a source/export
contract or a dynamic content operation.
