import { assert, it } from "@effect/vitest";
import { DocsImageRenderError } from "@taxkit/content/errors";
import { DocsOgImage, DocsPngBytes } from "@taxkit/content/schemas";
import { DocsOgImages, DocsPageRenderer } from "@taxkit/content/service";
import { Effect, Fiber, Layer, Ref, Result, Schema } from "effect";
import { TestClock } from "effect/testing";

import { DocsOgImagesLive } from "../src/cache.layer.js";

const png = Effect.gen(function* () {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 1200);
  view.setUint32(20, 630);
  return yield* Schema.decodeEffect(DocsPngBytes)(bytes);
});
const image = (title: string) =>
  Schema.decodeEffect(DocsOgImage)({
    description: "A checked page.",
    path: "/start/quickstart",
    title,
  });

it.effect("concurrent renders share equal images and hold one permit", () =>
  Effect.gen(function* () {
    const bytes = yield* png;
    const active = yield* Ref.make(0);
    const peak = yield* Ref.make(0);
    const renders = yield* Ref.make(0);
    const renderer = Layer.succeed(
      DocsPageRenderer,
      DocsPageRenderer.of({
        renderPage: () =>
          Effect.acquireUseRelease(
            Ref.updateAndGet(active, (count) => count + 1),
            (count) =>
              Effect.gen(function* () {
                yield* Ref.update(peak, (maximum) => Math.max(maximum, count));
                yield* Ref.update(renders, (value) => value + 1);
                yield* Effect.sleep("1 second");
                return bytes;
              }),
            () => Ref.update(active, (count) => count - 1)
          ),
      })
    );
    const first = yield* image("Quickstart");
    const second = yield* image("Overview");
    yield* Effect.gen(function* () {
      const images = yield* DocsOgImages;
      const work = yield* Effect.all(
        [
          images.renderPage(first),
          images.renderPage({ ...first }),
          images.renderPage(second),
        ],
        { concurrency: "unbounded" }
      ).pipe(Effect.forkChild);
      yield* TestClock.adjust("2 seconds");
      assert.strictEqual((yield* Fiber.join(work)).length, 3);
      assert.strictEqual(yield* Ref.get(renders), 2);
      assert.strictEqual(yield* Ref.get(peak), 1);
      assert.strictEqual(yield* Ref.get(active), 0);
    }).pipe(Effect.provide(DocsOgImagesLive.pipe(Layer.provide(renderer))));
  })
);

it.effect("a render past thirty seconds is interrupted as a timeout", () =>
  Effect.gen(function* () {
    const completed = yield* Ref.make(0);
    const renderer = Layer.succeed(
      DocsPageRenderer,
      DocsPageRenderer.of({
        renderPage: () =>
          Effect.never.pipe(
            Effect.ensuring(Ref.update(completed, (count) => count + 1))
          ),
      })
    );
    const first = yield* image("Quickstart");
    yield* Effect.gen(function* () {
      const images = yield* DocsOgImages;
      const pending = yield* images
        .renderPage(first)
        .pipe(Effect.result, Effect.forkChild);
      yield* TestClock.adjust("30 seconds");
      const result = yield* Fiber.join(pending);
      assert.isTrue(
        Result.isFailure(result) &&
          Schema.is(DocsImageRenderError)(result.failure) &&
          result.failure.reason === "timeout"
      );
      assert.strictEqual(yield* Ref.get(completed), 1);
    }).pipe(Effect.provide(DocsOgImagesLive.pipe(Layer.provide(renderer))));
  })
);

it.effect("successful renders are cached, but a failure retries at once", () =>
  Effect.gen(function* () {
    const bytes = yield* png;
    const count = yield* Ref.make(0);
    const failsOnce = Layer.succeed(
      DocsPageRenderer,
      DocsPageRenderer.of({
        renderPage: () =>
          Ref.updateAndGet(count, (value) => value + 1).pipe(
            Effect.flatMap((attempt) =>
              attempt === 1
                ? Effect.fail(new DocsImageRenderError({ reason: "render" }))
                : Effect.succeed(bytes)
            )
          ),
      })
    );
    const first = yield* image("Quickstart");
    yield* Effect.gen(function* () {
      const images = yield* DocsOgImages;
      assert.isTrue(
        Result.isFailure(yield* Effect.result(images.renderPage(first)))
      );
      assert.deepStrictEqual(yield* images.renderPage(first), bytes);
      yield* images.renderPage(first);
      assert.strictEqual(yield* Ref.get(count), 2);
    }).pipe(Effect.provide(DocsOgImagesLive.pipe(Layer.provide(failsOnce))));
  })
);
