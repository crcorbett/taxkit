import { assert, describe, it } from "@effect/vitest";
import { DiagramSource } from "@taxkit/mdx/schemas";
import { DiagramRenderer } from "@taxkit/mdx/service";
import { PeleRenderError } from "@taxkit/pele/errors";
import { PeleLive } from "@taxkit/pele/live";
import { Svg } from "@taxkit/pele/schemas";
import { Pele } from "@taxkit/pele/service";
import { Effect, Layer } from "effect";

import { PeleDiagramRendererLive } from "../src/pele.adapter.layer.js";

const DiagramsLive = PeleDiagramRendererLive.pipe(Layer.provide(PeleLive));
const OversizedPeleTest = Layer.effect(
  Pele,
  Svg.makeEffect(
    `<svg xmlns="http://www.w3.org/2000/svg">${" ".repeat(500_001)}</svg>`
  ).pipe(
    Effect.map((svg) =>
      Pele.of({
        renderSvg: Effect.fn("Pele.renderSvg")(() => Effect.succeed(svg)),
      })
    )
  )
);
const InvalidOutputPeleTest = Layer.succeed(
  Pele,
  Pele.of({
    renderSvg: Effect.fn("Pele.renderSvg")(() =>
      Effect.fail(new PeleRenderError({ reason: "output" }))
    ),
  })
);

describe("Pele MDX diagram adapter", () => {
  it.effect("draws a flowchart as one checked SVG document", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect(
        "flowchart LR\n  A[Server] --> B[SDK]\n  A --> C[HTTP API]"
      );
      const svg = yield* renderer.render(source);
      assert.match(svg, /^<svg[\s>]/u);
      assert.include(svg, "HTTP API");
    }).pipe(Effect.provide(DiagramsLive))
  );

  it.effect("returns a typed render failure for unreadable Mermaid", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect("not a diagram");
      const error = yield* renderer.render(source).pipe(Effect.flip);
      assert.strictEqual(error.reason, "render");
    }).pipe(Effect.provide(DiagramsLive))
  );

  it.effect("applies MDX's narrower output bound to valid provider SVG", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect("flowchart LR\n A --> B");
      const error = yield* renderer.render(source).pipe(Effect.flip);
      assert.strictEqual(error.reason, "svg");
    }).pipe(
      Effect.provide(
        PeleDiagramRendererLive.pipe(Layer.provide(OversizedPeleTest))
      )
    )
  );

  it.effect("preserves output failure meaning across the adapter", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect("flowchart LR\n A --> B");
      const error = yield* renderer.render(source).pipe(Effect.flip);
      assert.strictEqual(error.reason, "svg");
    }).pipe(
      Effect.provide(
        PeleDiagramRendererLive.pipe(Layer.provide(InvalidOutputPeleTest))
      )
    )
  );
});
