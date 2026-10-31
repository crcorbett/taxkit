import { assert, describe, it } from "@effect/vitest";
import { DiagramSource } from "@taxkit/mdx/schemas";
import { DiagramRenderer } from "@taxkit/mdx/service";
import { Effect } from "effect";

import { MermaidDiagramRendererLive } from "../src/mermaid.adapter.layer.js";

describe("Mermaid diagram renderer", () => {
  it.effect("draws a flowchart as one checked SVG document", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect(
        "flowchart LR\n  A[Server] --> B[SDK]\n  A --> C[HTTP API]"
      );
      const svg = yield* renderer.render(source);
      assert.match(svg, /^<svg[\s>]/u);
      assert.include(svg, "HTTP API");
    }).pipe(Effect.provide(MermaidDiagramRendererLive))
  );

  it.effect("returns a typed render failure for unreadable Mermaid", () =>
    Effect.gen(function* () {
      const renderer = yield* DiagramRenderer;
      const source = yield* DiagramSource.makeEffect("not a diagram");
      const error = yield* renderer.render(source).pipe(Effect.flip);
      assert.strictEqual(error.reason, "render");
    }).pipe(Effect.provide(MermaidDiagramRendererLive))
  );
});
