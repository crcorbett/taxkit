import { assert, it } from "@effect/vitest";
import { DocsOgImage } from "@taxkit/content/schemas";
import { DocsPageRenderer } from "@taxkit/content/service";
import { Effect, Schema } from "effect";

import { DocsPageRendererLive } from "../src/takumi.adapter.layer.js";

it.effect("renders a checked 1200 × 630 PNG with the bundled font", () =>
  Effect.gen(function* () {
    const renderer = yield* DocsPageRenderer;
    const image = yield* Schema.decodeEffect(DocsOgImage)({
      description: "Calculate Australian take-home pay with the SDK.",
      path: "/start/quickstart",
      title: "Quickstart",
    });
    const bytes = yield* renderer.renderPage(image);
    assert.isAbove(bytes.byteLength, 1000);
  }).pipe(Effect.provide(DocsPageRendererLive))
);
