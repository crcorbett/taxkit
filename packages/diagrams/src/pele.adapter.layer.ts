import { DiagramRenderError } from "@taxkit/mdx/errors";
import { DiagramSvg } from "@taxkit/mdx/schemas";
import { DiagramRenderer } from "@taxkit/mdx/service";
import { Source } from "@taxkit/pele/schemas";
import { Pele } from "@taxkit/pele/service";
import { Effect, Layer, Match } from "effect";

// Convert between the provider's contract and MDX's narrower document contract.
// The host supplies PeleLive; this adapter chooses no provider or site palette.
export const PeleDiagramRendererLive = Layer.effect(
  DiagramRenderer,
  Effect.gen(function* () {
    const pele = yield* Pele;
    return DiagramRenderer.of({
      render: Effect.fn("DiagramRenderer.render")(function* (source) {
        const input = yield* Source.makeEffect(source).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "render" }))
        );
        const svg = yield* pele.renderSvg(input).pipe(
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
        return yield* DiagramSvg.makeEffect(svg).pipe(
          Effect.mapError(() => new DiagramRenderError({ reason: "svg" }))
        );
      }),
    });
  })
);
