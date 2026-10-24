import { DocsImageRenderError } from "@taxkit/content/errors";
import type { DocsOgImage } from "@taxkit/content/schemas";
import { DocsOgImages, DocsPageRenderer } from "@taxkit/content/service";
import { Cache, Effect, Exit, Layer, Semaphore } from "effect";

// Content's image contract with one render permit, a 30-second deadline and a
// small five-minute success cache; failures expire at once. The CDN keeps each
// image for seven days, so a Worker renders a page rarely.
export const DocsOgImagesLive = Layer.effect(
  DocsOgImages,
  Effect.gen(function* () {
    const renderer = yield* DocsPageRenderer;
    const semaphore = yield* Semaphore.make(1);
    const cache = yield* Cache.makeWith(
      Effect.fn("DocsOgImages.render")(function* (image: DocsOgImage) {
        return yield* renderer.renderPage(image).pipe(
          semaphore.withPermits(1),
          Effect.timeoutOrElse({
            duration: "30 seconds",
            orElse: () =>
              Effect.fail(new DocsImageRenderError({ reason: "timeout" })),
          })
        );
      }),
      {
        capacity: 8,
        timeToLive: Exit.match({
          onFailure: () => "0 seconds",
          onSuccess: () => "5 minutes",
        }),
      }
    );
    return DocsOgImages.of({
      renderPage: Effect.fn("DocsOgImages.renderPage")((image: DocsOgImage) =>
        Cache.get(cache, image)
      ),
    });
  })
);
