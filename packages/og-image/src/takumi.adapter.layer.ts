import takumiModule from "@takumi-rs/wasm/auto";
import { DocsImageRenderError } from "@taxkit/content/errors";
import { DocsPngBytes, docsOgImageSize } from "@taxkit/content/schemas";
import type { DocsOgImage } from "@taxkit/content/schemas";
import { DocsPageRenderer } from "@taxkit/content/service";
import { Function as EffectFunction, Effect, Layer, Schema } from "effect";
import * as Base64 from "effect/encoding/Base64";
import { render } from "takumi-js";

import fontBase64 from "./geist-latin.base64.txt?raw";
import { pageImage } from "./image.js";
// The bundled Geist font is decoded once when the Layer is built; a corrupt
// asset stops startup. All Takumi calls stay in this one operation.
export const DocsPageRendererLive = Layer.effect(
  DocsPageRenderer,
  Effect.gen(function* () {
    const font = yield* Base64.decode(fontBase64).pipe(
      Effect.fromResult,
      Effect.mapError(() => new DocsImageRenderError({ reason: "font" }))
    );
    return DocsPageRenderer.of({
      renderPage: Effect.fn("DocsPageRenderer.renderPage")(function* (
        image: DocsOgImage
      ) {
        // The SDK Promise stays private; interruption aborts Takumi's host call.
        const bytes = yield* Effect.tryPromise({
          catch: () => new DocsImageRenderError({ reason: "render" }),
          try: (signal) =>
            EffectFunction.pipe(pageImage(image), (node) =>
              render(node, {
                emoji: "from-font",
                fonts: [{ data: font, name: "Geist" }],
                format: "png",
                height: docsOgImageSize.height,
                module: takumiModule,
                signal,
                width: docsOgImageSize.width,
              })
            ),
        });
        return yield* Schema.decodeUnknownEffect(DocsPngBytes)(bytes).pipe(
          Effect.mapError(() => new DocsImageRenderError({ reason: "output" }))
        );
      }),
    });
  })
);
