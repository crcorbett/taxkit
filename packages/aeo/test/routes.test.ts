import { assert, describe, it } from "@effect/vitest";
import { DocsImageRenderError, DocsSourceError } from "@taxkit/content/errors";
import { DocsPngBytes } from "@taxkit/content/schemas";
import { ContentCatalogue, DocsOgImages } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Effect, Layer, Option, Ref, Schema } from "effect";
import {
  Headers,
  HttpClientRequest,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { exampleOrigins } from "../src/__testing__/fixtures.js";
import { aeoRoutes } from "../src/routes.layer.js";
import { PublicationOrigins } from "../src/service.js";

const png = Effect.gen(function* () {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, 1200);
  view.setUint32(20, 630);
  return yield* Schema.decodeEffect(DocsPngBytes)(bytes);
});

const serve = (
  address: string,
  layer: Layer.Layer<
    ContentCatalogue | DocsOgImages | PublicationOrigins,
    Schema.SchemaError
  >
) =>
  Effect.gen(function* () {
    const handler = yield* HttpRouter.toHttpEffect(aeoRoutes);
    const request = HttpClientRequest.get(`http://taxkit.internal${address}`);
    const response = yield* handler.pipe(
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromClientRequest(request)
      ),
      Effect.catchCause((cause) =>
        HttpServerError.causeResponse(cause).pipe(
          Effect.map(([failure]) => failure)
        )
      )
    );
    return HttpServerResponse.toClientResponse(response, { request });
  }).pipe(Effect.provide(layer), Effect.scoped);

const layers = Effect.gen(function* () {
  const bytes = yield* png;
  const reads = yield* Ref.make(0);
  const origins = yield* exampleOrigins;
  const layer = Layer.mergeAll(
    Layer.effect(ContentCatalogue, exampleContentCatalogue),
    Layer.succeed(DocsOgImages, {
      getImage: () => Effect.succeed(bytes),
    }),
    Layer.succeed(PublicationOrigins)(
      Ref.update(reads, (count) => count + 1).pipe(Effect.as(origins))
    )
  );
  return { bytes, layer, reads };
});

describe("answer-engine routes", () => {
  it.effect("serve the four documents with their media types", () =>
    Effect.gen(function* () {
      const { layer } = yield* layers;
      const cases = [
        ["/api/v1/docs/discovery/sitemap.xml", "application/xml"],
        ["/api/v1/docs/discovery/robots.txt", "text/plain"],
        ["/api/v1/docs/discovery/llms.txt", "text/plain"],
        ["/api/v1/docs/discovery/llms-full.txt", "text/plain"],
      ] as const;
      yield* Effect.forEach(cases, ([address, type]) =>
        Effect.gen(function* () {
          const response = yield* serve(address, layer);
          assert.equal(response.status, 200, address);
          assert.deepEqual(
            Headers.get(response.headers, "content-type"),
            Option.some(`${type}; charset=utf-8`)
          );
          assert.deepEqual(
            Headers.get(response.headers, "x-content-type-options"),
            Option.some("nosniff")
          );
        })
      );
    })
  );

  it.effect("serve each published page's share image as PNG", () =>
    Effect.gen(function* () {
      const { bytes, layer } = yield* layers;
      const response = yield* serve(
        "/api/v1/docs/og/start/overview.png",
        layer
      );
      assert.equal(response.status, 200);
      assert.deepEqual(
        Headers.get(response.headers, "content-type"),
        Option.some("image/png")
      );
      assert.deepEqual(
        new Uint8Array(yield* response.arrayBuffer),
        new Uint8Array(bytes)
      );
      const missing = yield* serve("/api/v1/docs/og/private9.png", layer);
      assert.equal(missing.status, 404);
    })
  );

  it.effect("read stage origins lazily and once", () =>
    Effect.gen(function* () {
      const { layer, reads } = yield* layers;
      const handlerLayer = Layer.fresh(layer);
      yield* Effect.gen(function* () {
        const handler = yield* HttpRouter.toHttpEffect(aeoRoutes);
        assert.equal(yield* Ref.get(reads), 0);
        yield* Effect.forEach(
          ["/robots.txt", "/sitemap.xml", "/llms.txt"],
          (path) =>
            handler.pipe(
              Effect.provideService(
                HttpServerRequest.HttpServerRequest,
                HttpServerRequest.fromClientRequest(
                  HttpClientRequest.get(
                    `http://taxkit.internal/api/v1/docs/discovery${path}`
                  )
                )
              )
            )
        );
        assert.equal(yield* Ref.get(reads), 1);
      }).pipe(Effect.provide(handlerLayer), Effect.scoped);
    })
  );

  it.effect("answer 503 when origins or the image are unavailable", () =>
    Effect.gen(function* () {
      const layer = Layer.mergeAll(
        Layer.effect(ContentCatalogue, exampleContentCatalogue),
        Layer.succeed(DocsOgImages, {
          getImage: () =>
            Effect.fail(new DocsImageRenderError({ reason: "render" })),
        }),
        Layer.succeed(PublicationOrigins)(
          Effect.fail(
            new DocsSourceError({
              message: "Settings unavailable.",
              operation: "getDiscoveryDocument",
            })
          )
        )
      );
      const document = yield* serve("/api/v1/docs/discovery/llms.txt", layer);
      assert.equal(document.status, 503);
      const image = yield* serve("/api/v1/docs/og/start/overview.png", layer);
      assert.equal(image.status, 503);
    })
  );
});
