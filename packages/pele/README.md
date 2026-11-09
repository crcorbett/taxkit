# @taxkit/pele

An Effect service for [Pele](https://github.com/obsidianmd/pele), pinned to 1.13.0.
It renders Mermaid definitions to standalone SVG without a browser. This package
imports no MDX, Content, app, filesystem or application runtime.

- `./service`: `Pele.renderSvg({ source, typography })` returns a closed `Effect<Svg, PeleRenderError>`.
- `./schemas`: branded `Source` and `Svg`. Source preserves whitespace and is
  bounded to Pele's default 50,000 characters; SVG requires its namespace and is
  bounded to the provider's default 4,000,000 characters. These checks establish
  format and size, not an independent SVG sanitiser.
- `./live`: static `PeleLive`, with one private SDK call inside the named Effect
  operation. Its unknown reply is decoded immediately. Provider exceptions
  retain only checked failure codes, without messages, snippets or source text.
- `./errors`: rendering errors distinguish unsupported diagrams, syntax,
  semantic errors, limits, unexpected failure and invalid output.
- `src/test.layer.ts` (internal, this package's tests only): static `PeleTest`,
  providing the same contract with one fixed SVG.

```ts
import { PeleLive } from "@taxkit/pele/live";
import { Source } from "@taxkit/pele/schemas";
import { Pele } from "@taxkit/pele/service";
import { Effect, Option } from "effect";

const program = Effect.gen(function* () {
  const pele = yield* Pele;
  const source = yield* Source.makeEffect("flowchart LR\n A[Author] --> B[Reader]");
  return yield* pele.renderSvg({ source, typography: Option.none() });
}).pipe(Effect.provide(PeleLive));
```

The host executes the program in its existing runtime. There are no Layer
factories, generic SDK callbacks, DOM mounting operations, retries or background
workers. Pele renders synchronously, so interruption applies before and after a
call; a timeout cannot pre-empt its CPU work. The Gantt today marker receives
Effect's clock rather than using Pele's wall-clock default.

`RenderSvgRequest` includes optional checked typography: bounded serialized
font stacks and a finite 8–48px font size. MDX supplies its shared font choices;
standalone callers can use `Option.none()` for native defaults.

Pele owns its CSS-variable defaults and font fallback. Inline SVG consumers can
style `--pele-*` variables; an SVG shown as an image uses its own defaults and
does not inherit page CSS. This package includes no TaxKit palette or font.

MDX consumers use the separate
[diagram adapter](../diagrams/README.md), which converts between independently
owned provider and document values and applies MDX's narrower SVG size limit.
