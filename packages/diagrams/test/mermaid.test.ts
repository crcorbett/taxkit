import { assert, describe, it } from "@effect/vitest";
import { DocsDiagramSource } from "@taxkit/content/schemas";
import { DocsDiagramRenderer } from "@taxkit/content/service";
import { Effect } from "effect";

import { DocsDiagramRendererLive } from "../src/mermaid.adapter.layer.js";

describe("Mermaid diagram renderer", () => {
  it.effect("draws a flowchart as one checked SVG document", () =>
    Effect.gen(function* () {
      const renderer = yield* DocsDiagramRenderer;
      const source = yield* DocsDiagramSource.makeEffect(
        "flowchart LR\n  A[Server] --> B[SDK]\n  A --> C[HTTP API]"
      );
      const svg = yield* renderer.render(source);
      assert.match(svg, /^<svg[\s>]/u);
      assert.include(svg, "HTTP API");
    }).pipe(Effect.provide(DocsDiagramRendererLive))
  );

  it.effect("returns a typed render failure for unreadable Mermaid", () =>
    Effect.gen(function* () {
      const renderer = yield* DocsDiagramRenderer;
      const source = yield* DocsDiagramSource.makeEffect("not a diagram");
      const error = yield* renderer.render(source).pipe(Effect.flip);
      assert.strictEqual(error._tag, "DocsDiagramRenderError");
      assert.strictEqual(error.reason, "render");
    }).pipe(Effect.provide(DocsDiagramRendererLive))
  );
});
