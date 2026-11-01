import { DiagramRenderError } from "@taxkit/mdx/errors";
import { DiagramSvg } from "@taxkit/mdx/schemas";
import { DiagramRenderer } from "@taxkit/mdx/service";
import type { FontStack, Scheme } from "@taxkit/mdx/theme";
import { FontFamily, FontSizePx, Source } from "@taxkit/pele/schemas";
import { Pele } from "@taxkit/pele/service";
import {
  Array,
  Effect,
  Function as EffectFunction,
  Layer,
  Match,
  Option,
} from "effect";

const formatFontStack = (stack: FontStack) =>
  EffectFunction.pipe(
    stack.names,
    Array.map((name) => `"${name}"`),
    Array.append(stack.fallback),
    Array.join(",")
  );
// Only checked colours and fixed declarations enter the embedded stylesheet.
const serializeScheme = (scheme: Scheme) =>
  `--pele-bg:${scheme.palette.background};--pele-fg:${scheme.palette.foreground};--pele-muted:${scheme.palette.muted};--pele-surface:${scheme.palette.surface};--pele-surface-alt:${scheme.palette.surfaceAlt};--pele-border:${scheme.palette.border};--pele-line:${scheme.palette.foreground};--pele-accent:${scheme.palette.accent};--pele-critical:${scheme.palette.critical};${EffectFunction.pipe(
    scheme.series,
    Array.map((color, index) => `--pele-series-${index + 1}:${color};`),
    Array.join("")
  )}`;

// Convert between the provider's contract and MDX's narrower document contract.
// The host supplies PeleLive; this adapter chooses no provider or site palette.
export const PeleDiagramRendererLive = Layer.effect(
  DiagramRenderer,
  Effect.gen(function* () {
    const pele = yield* Pele;
    return DiagramRenderer.of({
      render: Effect.fn("DiagramRenderer.render")(function* ({
        source,
        theme,
      }) {
        const input = yield* Source.makeEffect(source).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "render" }))
        );
        const fontFamily = yield* FontFamily.makeEffect(
          formatFontStack(theme.typography.text)
        ).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "render" }))
        );
        const fontFamilyMono = yield* FontFamily.makeEffect(
          formatFontStack(theme.typography.code)
        ).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "render" }))
        );
        const fontSize = yield* FontSizePx.makeEffect(
          theme.typography.diagramSize
        ).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "render" }))
        );
        const typography = { fontFamily, fontFamilyMono, fontSize };
        const svg = yield* pele
          .renderSvg({ source: input, typography: Option.some(typography) })
          .pipe(
            Effect.mapError(
              (error) =>
                new DiagramRenderError({
                  reason: Match.value(error.reason).pipe(
                    Match.when("output", () => "svg" as const),
                    Match.orElse(() => "render" as const)
                  ),
                })
            )
          );
        const styles = `<style>:root{--pele-fg-on-light:${theme.light.palette.foreground};--pele-fg-on-dark:${theme.dark.palette.foreground};${serializeScheme(theme.light)}}@media(prefers-color-scheme:dark){:root{${serializeScheme(theme.dark)}}}</style>`;
        return yield* DiagramSvg.makeEffect(
          svg.replace(/<\/svg>\s*$/u, `${styles}</svg>`)
        ).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "svg" }))
        );
      }),
    });
  })
);
