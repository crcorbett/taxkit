# Paired MDX themes as checked render data

Status: Accepted. Implementing this decision replaces the single Pierre preset
selected through `MDX_THEME` and Pele's independent defaults.

## Decision

Define one immutable, Schema-checked `Theme` with light and dark schemes and
shared typography. Pass it explicitly to `MdxRenderer.render`. Return one
self-contained rendered document supporting both modes. The host chooses the
display mode without invoking a provider again.

Keep compilation, provider acquisition and theme selection independent.
`Document` remains presentation-free. Existing static Layers acquire provider
instances; theme values are operation data. Do not add a theme service, mutable
theme state, provider registry or Layer factory.

This revises the fixed-theme rendering contract in
[ADR 0007](0007-content-neutral-mdx.md) and the single-theme presentation in
[ADR 0008](0008-effect-rendering-providers.md). Their publication, provider
ownership and host-startup decisions remain applicable.

## Theme vocabulary and Schemas

`@taxkit/mdx/theme` owns the framework-independent Schemas. All types derive
from those Schemas. The following is the core shape:

```ts
const ColorRole = Schema.Literals([
  "background", "foreground", "muted", "surface", "surfaceAlt",
  "border", "accent", "critical",
]);
const SyntaxRole = Schema.Literals([
  "comment", "keyword", "string", "number", "constant", "function",
  "type", "variable", "property", "operator", "punctuation",
]);

const TokenAppearance = Schema.Struct({ color: Color, style: TokenStyle });
const Scheme = Schema.Struct({
  palette: Schema.Record(ColorRole, Color),
  syntax: Schema.Record(SyntaxRole, TokenAppearance),
  series: Schema.Array(Color).check(
    Schema.isMinLength(8), Schema.isMaxLength(8),
  ),
});
const Theme = Schema.Struct({
  typography: Typography,
  light: Scheme,
  dark: Scheme,
});
type Theme = typeof Theme.Type;
```

The finite-key records require every declared role. Unknown role names fail at
strict ingress. The eight series colours cover Pele's chart palette. Their
order is meaningful. A preset supplies a complete theme; a checked override
must still produce a complete valid value. There is no implicit deep merge or
partially configured scheme.

`Color` is the single MDX-owned branded hexadecimal colour Schema, accepting
`#RRGGBB` and `#RRGGBBAA`. Replace the narrower name `TokenColor` throughout its
owners. A colour cannot contain CSS functions, variables or declarations.
`TokenStyle` retains the existing four alternatives: normal, italic, bold and
bold-italic. Precise font weights and arbitrary syntax scope dictionaries are
not part of this initial interface.

`Typography` contains `text` and `code` font stacks plus `diagramSize` in CSS
pixels. Each stack has at most eight branded `FontName` values and an explicit
generic fallback: serif, sans-serif or monospace. Names contain 1–64 Unicode
letters, numbers, spaces, underscores or hyphens, starting with a letter or
number; the serializer quotes them. `FontSizePx` is branded, finite and bounded
to 8–48. Shared typography prevents a colour-mode change from invalidating
diagram geometry. It does not install fonts or guarantee exact font metrics;
the host supplies its fonts and browser layout tests.

The host owns the actual palette and font choices. MDX and Pele contain no
TaxKit palette. The closed syntax vocabulary maps explicitly onto Pierre's
matching scopes; the provider's ordinary parent-scope/foreground fallback
handles more specific lexer categories. Expanding this vocabulary is an owned
contract change.

## Rendering interface and lifetime

The service operations remain closed Effects:

```ts
MdxCompiler.compile(source)
  // Effect<Document, CompileError>
MdxRenderer.render({ document, theme })
  // Effect<RenderedDocument, RenderError>
CodeHighlighter.highlight({ snippet, theme })
  // Effect<CodeLines, CodeHighlightError>
DiagramRenderer.render({ source, theme })
  // Effect<DiagramSvg, DiagramRenderError>
```

Define the request records with Schema, reusing `Document`, `Theme`,
`CodeSnippet` and `DiagramSource`. Both adapters receive the same checked,
immutable theme and project their needed fields beside their provider calls.
They do not independently read mode or palette configuration.

The Layer graph remains static:

```ts
const DiagramsLive = PeleDiagramRendererLive.pipe(Layer.provide(PeleLive));
const PresentationLive = MdxRendererLive.pipe(
  Layer.provide(
    Layer.mergeAll(PierreCodeHighlighterLive, DiagramsLive, ContentLinkResolverLive),
  ),
);

const renderArticle = Effect.gen(function* () {
  const artifacts = yield* MdxArtifacts;
  const compiler = yield* MdxCompiler;
  const renderer = yield* MdxRenderer;
  const theme = yield* artifacts.decodeTheme(themeJson);
  const document = yield* compiler.compile(source);
  return yield* renderer.render({ document, theme });
});
```

This is illustrative TaxKit composition: the host supplies its checked source,
theme JSON, Content resolver policy and existing runtime. Other hosts supply
their own `LinkResolver`. Stored-document callers decode `Document`
with `MdxArtifacts` and render without acquiring the compiler. Either sequence
can run during a build or a request on a qualified host. Different theme values
use the same Layer graph and provider instances.

`MdxArtifacts` gains `decodeTheme` and `encodeTheme`, using private JSON codecs
with fixed `onExcessProperty: "error"`, including nested values. These methods
return native `SchemaError` and expose no parser-options argument. Ordinary
structural Schemas retain Effect's parser semantics; exact artifact handling
belongs to these service operations.

Authored TypeScript themes use the fallible Schema constructor at the host
root. A fixed host setting can use Schema-backed Config in its owning Layer;
the decoded theme is then closed over and passed to `render`. There is no
mandatory environment key or config-only Context service. Remove Pierre's
independent `MDX_THEME` mode reader when migrating.

In TaxKit, `ContentMdxReaderLive` acquires the build's theme once through that
checked configuration path and passes it on each renderer call. The API build
root supplies the authored theme through its existing native ConfigProvider;
it must preserve publication and host configuration while adding this setting.
The reader returns the rendered theme with the reading body, so the catalogue
and public page retain the exact snapshot. This preserves Content's closed
`read(source)` interface and adds no forwarding service.

## Pierre: one tokenization, paired appearances

Translate the two checked schemes to Pierre's public theme objects and call
`codeToTokens` once with `themes: { light, dark }`, `defaultColor: false` and a
fixed private CSS-variable prefix. Pierre owns shared token segmentation for
the two themes. There is no attempt to zip separately tokenized token streams.

Immediately decode the known colour, italic and weight fields of the reply.
Translate missing style flags to normal, and retain only MDX-owned values:

```ts
const CodeToken = Schema.Struct({
  text: InlineText,
  light: TokenAppearance,
  dark: TokenAppearance,
});
```

Text occurs once. Every appearance has a checked colour; the supplied scheme's
foreground resolves any provider fallback. Preserve the existing whole-block
check that concatenated tokens reproduce the exact code text. Provider CSS maps,
theme objects and arbitrary CSS strings never enter the artifact.

The Web view generates a fixed set of CSS custom properties from these checked
fields. Its mode rules select colour, font style and weight together, including
when the two themes use different italic/bold settings.

## Pele: one SVG, both palettes, image isolation

Keep `@taxkit/pele` independent. Its `renderSvg` request gains optional,
provider-owned checked typography, mapped to Pele's public `fontFamily`,
`fontFamilyMono` and `fontSize` options. Standalone callers can retain the native
defaults; the MDX adapter supplies the theme's shared typography explicitly.
Pele's Layer, clock handling and immediate reply decoding retain their owners.

The MDX adapter renders geometry once. A private serializer adds one controlled
SVG stylesheet containing the light palette and a dark
`prefers-color-scheme` override. It uses Pele's public `--pele-*` variables:

| MDX value | Pele variable |
| --- | --- |
| Scheme background / foreground / muted | `--pele-bg` / `--pele-fg` / `--pele-muted` |
| Scheme surfaces / border | `--pele-surface` / `--pele-surface-alt` / `--pele-border` |
| Scheme foreground / accent / critical | `--pele-line` / `--pele-accent` / `--pele-critical` |
| Light / dark scheme foregrounds | `--pele-fg-on-light` / `--pele-fg-on-dark` |
| Scheme's eight series colours | `--pele-series-1` through `--pele-series-8` |

The serializer emits fixed declarations from checked colours. It accepts no
source CSS, selectors, URLs or arbitrary option records. It adds the stylesheet
inside the qualified provider SVG's final root closing tag, without rewriting
geometry, IDs, authored text or source. Construct the resulting `DiagramSvg`
again because it is a new value and must meet MDX's final output-size bound.
An unexpected SVG envelope or oversized result fails through the existing
diagram SVG error; it must not silently produce an unthemed result.

Continue displaying the result as an SVG image. Embedded SVG media queries can
follow the embedding element's computed `color-scheme`; arbitrary page CSS
variables do not cross that boundary. Explicit Mermaid styles retain their
authored meaning and can override theme defaults. This decision does not claim
that every explicitly authored colour will adapt or have sufficient contrast.

## Browser and artifact ownership

`RenderedDocument` version 2 carries the exact `theme` plus paired code
appearances and themed SVGs. `Document` remains version 1 and has no theme.
The rendered artifact is self-contained: changing a separate host palette
cannot leave its code and diagrams silently describing different themes.

Content preserves the MDX-owned theme and token Schemas when projecting a page
into its public reading body. The Web receives those values through its normal
loader; it does not import an API app module or acquire rendering providers.

Each reading container supports one host-owned preference: light, dark or
system. It emits the scoped mode marker and matching `color-scheme`. Explicit
mode wins over the system preference. The same CSS mode rules select reading
surfaces and code appearances; each SVG image follows the computed scheme.
Mode switching requires no provider call or Layer rebuild. A host persisting
preference owns its before-first-paint handling and hydration consistency.

Browser/React/CSS formatting is deterministic presentation over checked data;
it needs no Effect service. A text-only host can choose `theme.light` or
`theme.dark` directly.

## Settings, failures and migration

Provider work limits, link/image policy, layout settings and callback
capabilities remain outside `Theme`. Fixed provider policy uses checked Config
in its existing static Layer. A genuinely per-diagram setting belongs in an
explicit checked operation request. Do not expose the raw SDK options bag.

Invalid theme input fails before rendering. Provider initialization and
operation errors retain their existing closed vocabularies and safe diagnostics.
Rendering returns no partial document on a failure. Synchronous CPU work and
Pierre's host-startup WASM constraint are unchanged; this design does not
qualify request-time Pierre rendering in Workerd.

The paired token and page theme fields change the public docs JSON contract.
The docs namespace moves to `/api/v2/docs`, including discovery and share-image
paths, with matching generated client/OpenAPI and Web changes. Calculator routes
retain their existing version. Changesets record the breaking contract changes.
Do not silently replace the existing public contract or keep an indefinite
single-theme compatibility model. Rebuild stored rendered artifacts; do not
guess a missing theme while decoding version 1. Markdown and compiled document
semantics remain unchanged.

No cache is introduced. Any later rendered-artifact cache must distinguish full
source content, the complete checked theme, provider/renderer revisions and
resolver snapshot. A mode or theme name alone is insufficient.

## Trade-offs

Paired appearances increase token payload size. They keep source text once,
preserve different font styles per mode, and retain a narrow colour contract.
Do not replace them with arbitrary provider CSS maps. Rendering two complete
documents would also duplicate every paragraph, heading and resolved link.

Embedded SVG styles require a small, provider-specific serializer and its
envelope/size tests. Keeping image presentation preserves the existing
isolation and avoids introducing inline SVG handling. Shared typography permits
one geometry; independently chosen fonts or sizes per colour mode would require
two geometries and are deliberately excluded.

## Evidence and implementation acceptance

Primary contracts inspected: Effect 4.0.7 (cloned revision
`b174739b6b39e4bf48f00f38f1d9fde7a6934368`), Pierre 0.3.0's public theme/token
types and implementation, and Pele 1.13.0's public options and CSS-variable
contract. [MDN documents inherited colour schemes in embedded SVG](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-color-scheme).

Local design probes qualified the finite-key Schemas and their strict parsing,
and typechecked them against the installed Effect version. Missing schemes and
roles, invalid colours, font CSS injection, a seven-colour series and nested
excess fields were rejected. A single real Pierre call preserved source text
and returned independent light/dark colours and font styles.

A real Pele SVG with a controlled paired stylesheet was displayed as a data-URL
image in Chromium and Firefox. Pixel readback confirmed explicit light,
explicit dark and system mode under both system preferences, including an
explicit dark container while the system preference was light. These probes
qualify the design's native mechanisms, not an implemented end-to-end feature;
WebKit and hosted deployment were not exercised.

Implementation acceptance must cover strict theme/artifact ingress, independent
Pele use, paired token text and styles, consistent mode selection before and
after hydration, font/layout behaviour, SVG bounds and typed failure handling,
provider substitution, and the complete authored corpus in both modes. Verify
public docs API migration and Markdown preservation, then run the repository's
normal verification and native browser gates. Colour validity does not prove
contrast; review the actual chosen palettes and rendered examples.
