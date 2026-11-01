# Effect-owned rendering providers

Use Pele for Mermaid rendering through an independent Effect service, and acquire
Pierre's private highlighter instance inside its static Layer through the
published API. This refines
[ADR 0007](0007-content-neutral-mdx.md) without changing the document formats,
supported Markdown grammar or TaxKit's build-time catalogue policy.

## Provider and document ownership

`@taxkit/pele` owns `Pele.renderSvg(source)`, returning a closed
`Effect<Svg, PeleRenderError>`. Its owning Schemas brand `Source` and `Svg`,
preserve source whitespace and apply Pele's default source/output bounds.
The static `PeleLive` Layer keeps the SDK private, catches synchronous failures
and immediately decodes its unknown reply. `PeleTest` substitutes at the same
contract. It imports no MDX, Content, app, filesystem or runtime.

Pele's error messages can include authored text. Retain only checked bounded
codes: unsupported diagram, syntax, semantic and limit failures. Unexpected
provider failures become `render`; an invalid reply becomes `output`. Do not
expose provider exceptions, snippets or unchecked causes. Calls are synchronous
and have no retries. Gantt's today marker uses Effect's clock.

`@taxkit/diagrams/pele` owns the static `PeleDiagramRendererLive` adapter. It
requires `Pele`, converts between independently owned brands and maps errors
into MDX's existing `DiagramRenderError`. MDX keeps its narrower SVG size bound.
These are distinct contracts: a Pele caller can render a diagram without
documents, frontmatter, links or TaxKit publication rules. MDX can use a different
diagram provider by implementing its existing `DiagramRenderer` contract.

The host composes static values:

```ts
const DiagramsLive = PeleDiagramRendererLive.pipe(Layer.provide(PeleLive));
const PresentationLive = MdxRendererLive.pipe(
  Layer.provide(
    Layer.mergeAll(PierreCodeHighlighterLive, DiagramsLive, ContentLinkResolverLive)
  )
);
```

Content's checked link-policy requirement is supplied separately by the host.
There are no Layer factories, SDK callbacks or additional forwarding services.
Pure compiler mappings use native Effect collections without wrapping every node
in `Effect.succeed`. Already-checked fields compose directly; new constrained
values and new record-level relationships still use their owning checks.

## Pierre initialization

Use Pierre 0.3.0's published `@pierre/highlights` and theme exports without
dependency patches, private deep imports or custom WASM loading. The root entry
initializes shared WASM during static import. Module-load failures belong to host
startup, before a Layer exists; they cannot be promised as typed Effect failures.

`PierreCodeHighlighterLive` checks theme Config and calls public
`createHighlighter()` inside `Effect.try` during Layer acquisition. It creates a
separate private instance and reuses it in that scope. Instance creation failures
return `CodeHighlighterInitializationError`, without a fabricated snippet or
language. Operations continue to return `CodeHighlightError` with checked token
lines. The compiler and artifact services do not acquire providers.

Keeping the SDK unmodified makes upgrades follow its supported contract. Accept
its import-time startup constraint explicitly rather than adding a loader
framework or weakening the static-import rules to hide it.

## Presentation and verification

Pele replaces `beautiful-mermaid`; no legacy export or fallback remains. SVG
geometry and styling intentionally change. Pele owns its native CSS-variable
defaults and font fallback; the provider wrapper contains no TaxKit palette.
Inline SVG consumers can set `--pele-*` variables. TaxKit displays SVG as an
image, which uses its own defaults and does not inherit page CSS. Schema checks
establish bounded SVG format, not a separate sanitization guarantee.

Verify independent Pele usage, branded input/output, safe provider failures,
deterministic test substitution and clock-controlled Gantt rendering. Qualify
Pierre's public entry in supported hosts and its startup failure in an isolated
host without WebAssembly, without module mocking. Compile the complete authored
corpus and compare it with
the pre-migration catalogue, excluding only intentional diagram SVG changes:
page order, anchors, text, code/tokens, links, Mermaid definitions, titles and
processed Markdown must remain equal. Native Website/API checks cover serving
the rebuilt catalogue.

Owned Layers describe private-instance acquisition; Pierre's SDK import has the
separate startup constraint above. The host builds and shares Layers in its
existing scope. Parser and renderer CPU work is synchronous;
Effect interruption applies between operations and does not pre-empt a running
call. Bun/Node qualification does not qualify Pierre's Workerd entry.
TaxKit continues to serve prebuilt docs; request-time routes, caches, grammar
expansion and token-model changes are outside this change.
