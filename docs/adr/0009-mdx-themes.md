# Paired MDX themes as checked render data

Status: accepted

Define one immutable, Schema-checked `Theme` with light and dark schemes and
shared typography, and pass it explicitly to `MdxRenderer.render`. Rendering
returns one self-contained document supporting both modes, and the host chooses
the display mode without calling a provider again. This replaces the
single-theme rendering in [ADR 0007](0007-content-neutral-mdx.md) and
[ADR 0008](0008-effect-rendering-providers.md); their publication, provider
ownership and host-startup decisions still apply.

Compilation, provider acquisition and theme selection stay independent.
`Document` remains presentation-free. Static Layers acquire providers; the
theme is operation data. There is no theme service, mutable theme state,
provider registry or Layer factory.

## Theme

`@taxkit/mdx/theme` owns the Schemas. Each scheme has a complete palette of
closed colour roles, a closed set of syntax roles (colour and one of four font
styles), and exactly eight ordered series colours for Pele charts. Colours are
branded `#RRGGBB` or `#RRGGBBAA` values and can never carry CSS functions,
variables or declarations. Typography (text and code font stacks with a generic
fallback, and a bounded diagram size) is shared by both schemes. A preset
supplies a complete theme; there is no implicit deep merge. MDX and Pele contain
no TaxKit palette: the host owns colour and font choices.

## Rendering

- Pierre tokenises each code block once with both themes. Each token stores its
  text once with a light and a dark appearance, and the tokens must still
  reproduce the exact code text. Provider CSS maps never enter the artifact.
- The diagram adapter renders Pele geometry once and adds one controlled
  stylesheet setting Pele's `--pele-*` variables for light, with a
  `prefers-color-scheme` dark override. The stylesheet is generated from checked
  colours only. The result is displayed as an image and follows the embedding
  element's computed `color-scheme`.
- `RenderedDocument` version 2 carries the exact theme with the paired code and
  SVG, so a separate host palette cannot drift from them. `Document` stays
  version 1.
- Each reading container supports light, dark or system appearance; the same
  CSS selects reading surfaces, token appearances and SVG schemes. Switching
  mode needs no provider call or Layer rebuild.

## Consequences

- The public docs JSON changed, so the docs namespace moved to `/api/v2/docs`
  with its discovery and share-image paths. Calculator routes kept their
  version. Version 1 rendered artifacts are rebuilt, not decoded with a guessed
  theme.
- Paired appearances enlarge token payloads but keep text once and allow
  different font styles per mode. Rendering two whole documents would duplicate
  every paragraph and link.
- Shared typography allows one diagram geometry. Different fonts or sizes per
  mode would need two geometries and are excluded.
- Explicit Mermaid styles keep their authored colours, which may not adapt or
  have enough contrast. Colour validity does not prove contrast.
- Any later rendered-artifact cache must key on source content, the complete
  checked theme, provider revisions and resolver snapshot.
