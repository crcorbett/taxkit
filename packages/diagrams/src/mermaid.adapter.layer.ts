import { DocsDiagramRenderError } from "@taxkit/content/errors";
import { DocsDiagramSvg } from "@taxkit/content/schemas";
import type { DocsDiagramSource } from "@taxkit/content/schemas";
import { DocsDiagramRenderer } from "@taxkit/content/service";
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
export const DocsDiagramRendererLive = Layer.succeed(DocsDiagramRenderer)(
  DocsDiagramRenderer.of({
    render: Effect.fn("DocsDiagramRenderer.render")(function* (
      source: DocsDiagramSource
    ) {
      const svg: unknown = yield* Effect.try({
        catch: () => new DocsDiagramRenderError({ reason: "render" }),
        try: () => renderMermaidSVG(source, diagramColours),
      });
      return yield* Schema.decodeUnknownEffect(DocsDiagramSvg)(svg).pipe(
        Effect.mapError(() => new DocsDiagramRenderError({ reason: "svg" }))
      );
    }),
  })
);
