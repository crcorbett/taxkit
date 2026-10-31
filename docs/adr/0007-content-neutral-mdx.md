# Content-neutral MDX compilation and rendering

Make `@taxkit/mdx` a content-neutral package with two Effect operations:
`compile` produces a checked semantic document; `render` prepares its links, code
and diagrams for presentation. Content owns TaxKit publication rules. The host
chooses when to execute either operation. This separation lets a build compile
once and requests render with different presentation policies without reparsing.

This records the accepted architecture and its migration requirements. It refines
[ADR 0006](0006-follow-common-practice.md); TaxKit retains build-time processing as
its default. The core services and Content adapters implement this split. Expanding the
Markdown grammar and choosing a component catalogue remain outside this decision.
The initial component vocabulary is empty; unsupported JSX fails closed.

## Ownership

MDX owns document Schemas, compiler and renderer contracts, typed failures and
format adapters. It does not import Content, TaxKit pages, navigation, a router,
a filesystem or an application runtime. Content imports MDX contracts and
Schemas; the app composes concrete Layers. Pierre and Mermaid implement MDX-owned
contracts without importing Content. Keep the existing packages; this decision
requires no additional package or plugin system.

Content owns frontmatter interpretation, publication, title matching, navigation,
repository revisions and link policy. A fragment without frontmatter or a heading
can compile. A draft can compile and render while Content excludes it from the
published catalogue. The compiler preserves all headings; Content projects the
page title and body into TaxKit's existing public representation.

The host React view consumes finished rendering data. In TaxKit it reads Content's
public projection and owns markup; the app supplies router links and navigation
focus. Core consumers need no React dependency or MDX-owned view entry. Importing
Schemas or the existing serving/view entry must not load compiler/provider engines.

## Values and invariants

These are distinct Schema-derived types, not three copies of the same DTO.

| Value | Contains | Guarantees |
| --- | --- | --- |
| `Source` | A branded, opaque `id` and source `text`. | The host has checked the input representation. The id is a logical identity, not permission to read a file or fetch a URL. |
| `Document` | Its format/version, `sourceId`, optional metadata and ordered semantic blocks. | Syntax and component shapes are checked. Original link targets, code text, diagram definitions and titles survive. There are no resolved site addresses, token colours, SVGs, parser ASTs or executable values. |
| `RenderedDocument` | Its own format/version and the same semantic content, enriched with resolved destinations, code tokens and SVGs. | All required rendering succeeded. Semantic text, order, metadata, heading ids and component meaning are unchanged. No unresolved link or missing required asset can masquerade as success. |

Derive rendered variants from shared node fields. Keep enrichment on the relevant
nodes; do not introduce an asset registry, duplicate tree or independently mutable
node-id map. A rendered code node retains its text as well as tokens; their text
must agree. Retain original link targets alongside resolved destinations. The Content
[Markdown writer](../../packages/content/src/reading-markdown.egress.ts) consumes
preserved code text before public projection; it does not reconstruct it from
highlighter output.

“Preserve text” means the parser's semantic text, including code indentation,
blank lines and trailing newlines, with its documented newline normalisation. It
does not promise byte-for-byte regeneration of authored MDX. Metadata is an
optional string-keyed mapping of finite JSON values, decoded once from YAML;
reject duplicate keys, aliases, unsupported tags, non-finite numbers and non-map
roots. Absence is an Effect `Option`; JSON null inside metadata remains a value.
Content subsequently validates its own page fields at its domain boundary. It must
explicitly project public fields rather than publish arbitrary metadata.

Source identity comes from `Source.id` and cannot be supplied again to override
link resolution or diagnostics. Compilation accepts LF and CRLF documents.
Current compilation errors carry the source id and a closed reason; rendering
errors also carry an integer node path. Exact source spans are not part of the
implemented compiler contract. Adding them requires a checked location Schema
and mapping parser offsets once at ingress to zero-based UTF-16 offsets with an
exclusive end in the original text, including frontmatter and CRLF. Do not expose
parser node types or fabricate locations.

Keep the current supported Markdown subset and language set explicit. Neutrality
does not mean full CommonMark or every language a provider happens to recognise.
Heading ids are determined during compilation, independently of theme and host.
Preserve the existing slug algorithm and duplicate/empty-id rejection for migration;
do not silently add suffixes and change existing anchors.

## Public operations and private verbs

| Boundary | Operation | Result / expected failure |
| --- | --- | --- |
| Public service | `MdxCompiler.compile(source)` | `Effect<Document, CompileError>` |
| Public service | `MdxRenderer.render(document)` | `Effect<RenderedDocument, RenderError>` |
| Public service | `MdxArtifacts.decodeDocument(json)` / `encodeDocument(document)` | `Effect<Document, SchemaError>` / `Effect<string, SchemaError>` |
| Public service | `MdxArtifacts.decodeRenderedDocument(json)` / `encodeRenderedDocument(document)` | `Effect<RenderedDocument, SchemaError>` / `Effect<string, SchemaError>` |
| Provider contract | `CodeHighlighter.highlight(snippet)` | Checked token lines / typed provider failure. |
| Provider contract | `DiagramRenderer.render(diagram)` | Checked SVG / typed provider failure. |
| Host policy contract | `LinkResolver.resolve(reference)` | Checked destination / typed resolution failure. The reference contains source identity and the authored target. |
| Package-private helpers, when needed | `parseSource`, `compileBlock`, `compileInline`, `renderBlock` | Implementation steps, not supported package APIs. |

The service-operation notation above is not a requirement for static methods.
For example, a host can compose already-checked input like this:

```ts
// Public API usage over already-checked input.
const program = Effect.gen(function* () {
  const compiler = yield* MdxCompiler;
  const renderer = yield* MdxRenderer;
  const document = yield* compiler.compile(source);
  return yield* renderer.render(document);
});
// The host supplies Layers and executes this program in its own runtime/scope.
```

`MdxLive` is the static convenience composition
`Layer.mergeAll(MdxCompilerLive, MdxRendererLive, MdxArtifactsLive)`. It introduces
no forwarding service and retains explicit provider requirements. Consumers may
choose individual Layers; rendering stored documents never requires compiler
acquisition. `MdxArtifactsLive` has no dependencies and keeps its codecs private.

For a stored document, the host yields `MdxArtifacts`, calls
`artifacts.decodeDocument(json)` and then `renderer.render(document)`. It need not
acquire a compiler.
Decoding an artifact is representation ingress; rendering an already-checked
Document must not decode the same domain value again.

MDX inherits the complete shared style and strict presets, including `no-ternary`. Use
native `Array.filter`/`Array.map` for selection, `Option` for absence, `Boolean`
for boolean branches and exhaustive `Match` for domain alternatives. The owning
heading-uniqueness check is shared by both artifact formats.

Use nouns for services, models and Layers; verbs for operations. Reserve `parse`
for source-to-syntax, `compile` for source-to-document, `render` for presentation,
`load` for host I/O, and `encode`/`decode` for the native Schema codecs. Do not add
`read`, `process`, `handle`, `compileForBuild` or `renderForRequest` aliases.

Implement public operations with named `Effect.fn`, such as
`Effect.fn("MdxCompiler.compile")` and `Effect.fn("MdxRenderer.render")`, and check
implementations with `Service.of`. Dependent private generators use
`Effect.fnUntraced`; short pipelines and total pure helpers need no extra wrapper.
Schemas own the value types; illustrative records are not parallel DTO contracts.

Explicit package exports enforce visibility. Helpers exported between private
modules remain private to package consumers. No wildcard exports, public parser
AST, underscore convention, one-file-per-helper rule or forwarding methods.
Keep contract, Schema, error, live adapter and React entry points separate;
instantiate no runtime inside them. A React component returns elements directly.

## Component admission

Support a closed, versioned vocabulary of explicitly modelled component nodes.
The package owns their Schemas and exhaustive rendering/textual semantics. Do not
add a caller-supplied component registry, arbitrary callback hooks or a generic
`{ name, props: unknown }` node. No current authored page requires JSX; `Callout`
is an illustrative contract case, not an instruction to add it or a component suite.

Validate the parser's JSX nodes recursively, not source text with regular
expressions. For each admitted component:

- Check its exact name, required/optional attributes, child grammar and allowed
  block or inline placement. A block component inside a paragraph must fail rather
  than generate invalid HTML. The parser distinguishes flow and text JSX nodes.
- Admit quoted literal attributes and bare boolean attributes only where its
  Schema defines them. Apply declared defaults once during compilation. Reject
  duplicate attributes before turning the attribute list into a record.
- Reject spreads, braced attribute expressions (including `tone={"note"}`), event
  handlers and unsupported names/attributes. Literal JSX inside code fences stays
  code text. Do not inspect it as an executable component.
- Define its React and textual representation before admitting its node. A
  renderer encountering an unsupported node/version fails; it never drops it.

Imports, exports, arbitrary expressions and evaluation remain unsupported. This
trades full MDX execution and open-ended extensions for portable checked output.
Adding a new wire node requires an explicit format compatibility decision, not
silently widening an exhaustive union for old readers.

## Failures and lifetimes

Compiler operations require no highlighter, diagram renderer or link resolver.
Renderer Layers capture exactly those dependencies, using immutable policy
snapshots supplied by the host. Operations return lazy Effects with no additional
service requirements. The same contracts accept deterministic test Layers.

Declare every owned live and test Layer as a static value. Dependencies belong in
its Requirements channel, not factory arguments: no `makeRendererLayer(snapshot,
theme)`, `PierreCodeHighlighterLive(options)` or other owned Layer factory.
Static declarations describe acquisition; they do not acquire resources on import
or imply one global service instance. Build them in the application's existing
scope, once per build invocation or serving runtime, and reuse their services for
documents and requests. Do not build Layers or runtimes inside service methods
or request handlers.

Choose configuration by ownership and lifetime:

- Fixed host settings use owning Schema-checked `Config` declarations, yielded
  during Layer construction with the host's existing ConfigProvider. Do not add
  a configuration service merely to wrap a setting.
- Already-checked, caller-supplied policy uses named Context requirements and
  native `Layer.succeed` at composition. Content owns the publication snapshot
  required by its link resolver; MDX requires only `LinkResolver`, so it cannot
  acquire Content's catalogue or navigation.
- Source and document values remain operation arguments. Native request data
  stays in the request fibre and is checked at its host boundary; it must not be
  captured by a long-lived provider Layer.

For example, these static host composition values illustrate policy acquisition
(the snapshot loader and tag names below stand for host-owned policy):

```ts
const MdxPresentationLive = MdxRendererLive.pipe(
  Layer.provide(
    Layer.mergeAll(
      PierreCodeHighlighterLive,
      MermaidDiagramRendererLive,
      ContentLinkResolverLive
    )
  )
);

// At host acquisition, load and check the existing publication policy.
// PublicationSnapshot denotes Content's checked policy requirement.
const PublishedMdxLive = Layer.unwrap(
  Effect.gen(function* () {
    const snapshot = yield* loadPublicationSnapshot;
    return MdxPresentationLive.pipe(
      Layer.provide(Layer.succeed(PublicationSnapshot, snapshot))
    );
  })
);

// Only a host that compiles source needs to include this service.
const SourceMdxLive = Layer.merge(MdxCompilerLive, PublishedMdxLive);
```

The illustrative loading Effect retains its I/O and decode requirements; the
host supplies those too. Native callbacks inside `Layer.unwrap` are supported;
wrapping this composition in an owned function returning a Layer is not.
`Layer.provide` connects dependencies, whereas `Layer.merge`/`mergeAll` only
combine outputs. Share the same provider Layer values within the host graph so
normal build memoisation shares acquisition.

For an authored publication build, compile and apply Content's publication rules
before supplying the complete immutable snapshot to rendering. For a serving
runtime, acquire its checked snapshot once at startup. The snapshot must not
depend on rendered pages: that would create a renderer/resolver cycle. Theme and
policy are fixed for that host scope; different builds or host scopes may supply
different values. Hot reload and per-request theme selection are outside this
decision and must not be smuggled in as Layer factories.

Host orchestration stays in Effect, including loading, decoding and persistence.
Only a framework-required callback may be Promise-shaped, immediately delegating
to the host's existing runtime. React consumes finished data without running
Effects. Presentation adapters such as router links are explicit view props,
not an open component registry or generic callback service.

`CompileError` identifies malformed syntax/metadata, unsupported constructs and
invalid component/document structure. `RenderError` distinguishes link rejection,
provider refusal and malformed provider output, with the source and relevant node
path. Preserve bounded provider reason codes; omit raw exceptions and source text.
Use Effect's typed error channel for these failures and exhaustive matching for
recovery. Defects and interruption remain causes. Fail the whole operation; do not
return partial documents, silently remove blocks or automatically retry deterministic
syntax, validation or provider failures. The host owns any request error response.

Provider replies must satisfy semantic invariants as well as field shapes: tokens
must reproduce code text, and resolved links must be safe destinations under the
host's policy. Content supplies its existing relative-page/repository rules; MDX
must not embed those rules. SVG acceptance is for image presentation, matching the
current React view. A string beginning with `<svg>` is not proof it is safe to
inject as inline HTML; this change does not add inline-SVG rendering.

Acquire private provider instances through native APIs where available, such as
Pierre's `createHighlighter`, and keep mutable provider objects inside their Layer.
Map acquisition failures controlled by that Layer separately from per-document
failures. Installed Pierre entry points also initialise WebAssembly on import:
module-load failures before a Layer exists are host startup failures, not promised
`RenderError` values. Do not invent a loader framework to conceal that distinction.

Parser, highlighter and Mermaid calls are synchronous. Effect preserves structured
interruption between operations, but cannot pre-empt synchronous work already
running. A timeout is not a CPU budget. Retain existing input/output bounds, check
host admission limits before work and qualify request-time costs in the chosen
host; hard pre-emption is not promised by this design.

## Artifacts, timing and cache validity

Build/build, build/request and request/request use the same operations and policies.
The package has no timing mode, cache, filesystem or batch scheduler. The host owns
execution, source loading, concurrency, persistence and invalidation. The framework
can produce HTML from the React view at either time.

Document and RenderedDocument have distinct format discriminators and explicit
versions, independent of the npm version and TaxKit catalogue version. Their JSON
codecs check the version, node vocabulary and structural invariants. Reject
malformed and unsupported versions; do not guess, cast or silently migrate them.
The host can regenerate from source or report failure. `MdxArtifacts` owns
`decodeDocument`, `encodeDocument`, `decodeRenderedDocument` and
`encodeRenderedDocument` as service methods. The `./artifacts` export provides
static `MdxArtifactsLive`; no standalone persistence functions are public.
These closed Effects use private native JSON codecs
with fixed `{ onExcessProperty: "error" }` options on both decoding and encoding;
callers cannot override them. Effect 4.0.6 does not enforce parser options through
Schema annotations. Keeping persistence behind these named operations prevents
callers from accidentally using the permissive default. Structural Schemas remain
public for modelling and composition; they are not the persistence API.
Failures stay native `SchemaError` values. Unknown keys are rejected throughout
versioned wire records, including nested nodes and tokens, while metadata remains
an open JSON mapping.
Do not put timestamps, React objects or functions into these artifacts.

Semantic scalar brands have one owner in MDX: `SourceId`, `SourceText`,
`CodeText`, `InlineText`, `HeadingId`, `LinkTarget`, `LinkDestination`, `ListStart`,
`TokenColor`, `DiagramTitle`, `DiagramSource` and `DiagramSvg`. Parser and provider
ingress reuse these Schemas; newly derived values use their fallible constructors.
Services carry the brands without casts or repeated decoding. Source/code text
limits, nonempty inline text, positive list starts and link-target bounds are
runtime checks; branding itself does not validate or normalise data. An unresolved
link target is distinct from a resolved destination. Closed literal enums,
`kind` discriminants and structural document types need no additional brands.
Brands erase in JSON and decoding restores them, preserving existing wire bytes.

Compilation cache identity includes logical source id, exact source-content digest
and compiler/grammar revision. Rendering identity includes the compiled artifact,
renderer/provider revisions, checked theme settings and the resolver's complete
snapshot identity (including navigation and repository revisions). A path or theme
name alone is insufficient. If the host cannot identify a stable policy snapshot,
it must not reuse rendering across requests. Cache bookkeeping stays outside the
MDX models; a cache must not be necessary for correctness.

Compare decoded outputs under identical pinned inputs and policies, including
provider-produced strings; object-key order in encoded JSON is immaterial. Changing
a theme changes presentation without changing Document semantics. Changing link
policy requires rerendering, not recompiling. Request-time qualification must load
the actual host-specific provider entry: Pierre's Bun/default entry compiles bytes,
whereas its `workerd` entry imports a compiled WASM module. Bun success is not Worker
success, and current native tests serve prebuilt docs rather than compile on requests.

## Evidence required for migration

Use independent examples as well as parity comparisons; two paths can share a bug.
The [existing corpus test](../../apps/api/test/docs-sources.test.ts) and
[native Website/API tests](../../apps/web/test/native-pair.boundary.test.ts) are
starting points, not proof of the new contracts.

| Boundary | Acceptance evidence |
| --- | --- |
| Public API | A consumer using only exported paths can compile a fragment and render a stored Document without acquiring a compiler. Type checks prove closed requirements; dependency/bundle checks exclude Content from MDX and provider engines from the serving/view entry. |
| Layer composition | The existing `strict-effect/static-layers` lint rule rejects owned factories. Type checks verify exact Layer dependencies and closed operations. Controlled adapters prove one acquisition per host scope, isolation between scopes, typed configuration/acquisition failure and cleanup where resources require release. A stored-document host builds without the compiler, and requests do not rebuild providers. |
| Source → Document | Hand-checked fixtures cover plain text without frontmatter, LF/CRLF, metadata absence/null/non-finite values, supported syntax and a schema-defined component. Reject unknown/duplicate attributes, wrong placement, expressions, imports and malformed syntax; fenced examples remain literal. |
| Document → rendering | Changing theme preserves code text, block order and headings; changing a resolver snapshot changes only resolved destinations. Reject missing targets, altered token text and malformed SVG replies. Verify each declared provider failure and no partial success. |
| Persistence | Round-trip both new codecs, including Option/null and empty code lines. Reject wrong artifact kinds, unknown versions/nodes/fields and missing required render data. A decoded artifact must render without original source text or compiler acquisition. |
| Execution parity | With pinned policies, compare a fresh compile/render against encode/decode/render and against the actual request host. Test interrupted work using controllable Layers; assert no later work or success artifact is published. Do not claim synchronous provider pre-emption. |
| Existing consumers | Compare migrated outputs to the existing authored corpus and public response/Markdown snapshots, then run native rendering tests. Preserve code, anchors, resolved links and diagrams; any public wire or Markdown change needs explicit contract treatment. |

JSON codec round-trip equality is a requirement. Authored-MDX or Markdown
round-trip equality is not: today's Markdown writer omits diagram title metadata
and normalises syntax. Do not mistake successful re-reading, or equality between
two newly generated catalogues, for preservation of the existing public contract.
