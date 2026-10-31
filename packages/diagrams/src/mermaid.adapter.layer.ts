import { DiagramRenderError } from "@taxkit/mdx/errors";
import { DiagramSvg } from "@taxkit/mdx/schemas";
import type { DiagramSource } from "@taxkit/mdx/schemas";
import { DiagramRenderer } from "@taxkit/mdx/service";
import { renderMermaidSVG } from "beautiful-mermaid";
import { Effect, Layer, Schema } from "effect";

// The Website's light palette. The SVG is shown as an image, so it carries
// its own colours and falls back to the system font.
const diagramColours = {
  accent: "#2563eb",
  bg: "#ffffff",
  fg: "#172033",
  font: "Inter",
  transparent: true,
} as const;

// beautiful-mermaid is the only diagram renderer. It lays out and draws the
// diagram synchronously, without a DOM; every call stays in this operation.
export const MermaidDiagramRendererLive = Layer.succeed(DiagramRenderer)(
  DiagramRenderer.of({
    render: Effect.fn("DiagramRenderer.render")(function* (
      source: DiagramSource
    ) {
      const svg: unknown = yield* Effect.try({
        catch: () => new DiagramRenderError({ reason: "render" }),
        try: () => renderMermaidSVG(source, diagramColours),
      });
      return yield* Schema.decodeUnknownEffect(DiagramSvg)(svg).pipe(
        Effect.mapError(() => new DiagramRenderError({ reason: "svg" }))
      );
    }),
  })
);
