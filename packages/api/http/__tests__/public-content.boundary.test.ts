import { assert, describe, it } from "@effect/vitest";
import { DocsSourceError } from "@taxkit/content/errors";
import { DocsPagePath, DocsSearchTerm } from "@taxkit/content/schemas";
import { ContentService } from "@taxkit/content/service";
import { exampleContentCatalogue } from "@taxkit/content/testing/fixtures";
import { Array, Deferred, Effect, Fiber, Layer, Ref, Schema } from "effect";
import {
  Headers,
  HttpClientRequest,
  HttpRouter,
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { TaxKitApiInProcessClientLive } from "../src/client/server.layer.js";
import { TaxKitHttpApiService } from "../src/client/service.js";
import {
  DocsPageUnavailable,
  DocsSearchUnavailable,
} from "../src/groups/content.js";
import { TaxKitServerLayer } from "../src/server.js";
import { ContentTestLive } from "./content.fixture.js";

const ClientTestLive = TaxKitApiInProcessClientLive.pipe(
  Layer.provide(ContentTestLive)
);

describe("checked public documentation HTTP", () => {
  it.effect(
    "returns the owning page, navigation, search and processed Markdown through the generated client",
    () =>
      Effect.gen(function* () {
        const catalogue = yield* exampleContentCatalogue;
        const client = yield* TaxKitHttpApiService;
        const path = yield* DocsPagePath.makeEffect("/start/overview");
        const term = yield* DocsSearchTerm.makeEffect("calculator");
        const page = yield* client.content.getPage({ query: { path } });
        assert.deepEqual(
          page,
          yield* Array.head(catalogue.pages).pipe(Effect.fromOption)
        );
        assert.deepEqual(
          yield* client.content.getNavigation(),
          catalogue.navigation
        );
        assert.equal(
          yield* client.content.getMarkdown({ query: { path } }),
          page.markdown
        );
        const results = yield* client.content.searchPages({ query: { term } });
        assert.equal(results.length, 1);
        const result = yield* Array.head(results).pipe(Effect.fromOption);
        assert.equal(result.path, path);
        assert.equal(result.title, page.frontmatter.title);
      }).pipe(Effect.provide(ClientTestLive))
  );

  it.effect(
    "returns typed missing-page failures for both representations without reflecting the requested path",
    () =>
      Effect.gen(function* () {
        const client = yield* TaxKitHttpApiService;
        const path = yield* DocsPagePath.makeEffect("/private-taxkit-sentinel");
        const expected = new DocsPageUnavailable({
          message: "The documentation page was not found.",
        });
        assert.deepEqual(
          yield* client.content.getPage({ query: { path } }).pipe(Effect.flip),
          expected
        );
        assert.deepEqual(
          yield* client.content
            .getMarkdown({ query: { path } })
            .pipe(Effect.flip),
          expected
        );
      }).pipe(Effect.provide(ClientTestLive))
  );

  it.effect.each([
    "/api/v1/docs/page",
    "/api/v1/docs/page?path=..%2Fprivate%2Ftaxkit-secret-sentinel",
    "/api/v1/docs/page?path=%2F%2Fstart%2Foverview",
    `/api/v1/docs/page?path=%2F${"a".repeat(257)}`,
    "/api/v1/docs/search",
    "/api/v1/docs/search?term=%20%20",
    `/api/v1/docs/search?term=${"taxkit-secret-sentinel".repeat(6)}`,
  ])("rejects invalid ingress with an empty 400 at %s", (address) =>
    Effect.gen(function* () {
      const handler = yield* HttpRouter.toHttpEffect(TaxKitServerLayer);
      const request = HttpClientRequest.get(`http://taxkit.internal${address}`);
      const response = yield* handler.pipe(
        Effect.provideService(
          HttpServerRequest.HttpServerRequest,
          HttpServerRequest.fromClientRequest(request)
        ),
        Effect.catchCause((cause) =>
          HttpServerError.causeResponse(cause).pipe(
            Effect.map(([invalidResponse]) => invalidResponse)
          )
        )
      );
      assert.equal(response.status, 400);
      assert.equal(
        yield* HttpServerResponse.toClientResponse(response, { request }).text,
        ""
      );
    }).pipe(Effect.provide(ContentTestLive), Effect.scoped)
  );

  it.effect(
    "serves plain Markdown with its declared media type and a fixed JSON 404",
    () =>
      Effect.gen(function* () {
        const handler = yield* HttpRouter.toHttpEffect(TaxKitServerLayer);
        const request = HttpClientRequest.get(
          "http://taxkit.internal/api/v1/docs/markdown?path=%2Fstart%2Foverview"
        );
        const response = yield* handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(request)
          )
        );
        assert.equal(response.status, 200);
        assert.include(
          yield* Headers.get(response.headers, "content-type").pipe(
            Effect.fromOption
          ),
          "text/markdown"
        );
        const body = yield* HttpServerResponse.toClientResponse(response, {
          request,
        }).text;
        const expected = yield* exampleContentCatalogue.pipe(
          Effect.flatMap((catalogue) =>
            Array.head(catalogue.pages).pipe(Effect.fromOption)
          )
        );
        assert.equal(body, expected.markdown);
        const missing = HttpClientRequest.get(
          "http://taxkit.internal/api/v1/docs/markdown?path=%2Fmissing"
        );
        const absent = yield* handler.pipe(
          Effect.provideService(
            HttpServerRequest.HttpServerRequest,
            HttpServerRequest.fromClientRequest(missing)
          )
        );
        assert.equal(absent.status, 404);
        assert.deepEqual(
          yield* Schema.decodeUnknownEffect(DocsPageUnavailable)(
            yield* HttpServerResponse.toClientResponse(absent, {
              request: missing,
            }).json
          ),
          new DocsPageUnavailable({
            message: "The documentation page was not found.",
          })
        );
      }).pipe(Effect.provide(ContentTestLive), Effect.scoped)
  );

  it.effect(
    "projects a controlled source failure to fixed search guidance",
    () =>
      Effect.gen(function* () {
        const live = yield* ContentService;
        const controlled = Layer.succeed(
          ContentService,
          ContentService.of({
            ...live,
            searchPages: () =>
              Effect.fail(
                new DocsSourceError({
                  message: "/private/taxkit-secret-sentinel",
                  operation: "searchPages",
                })
              ),
          })
        );
        yield* Effect.gen(function* () {
          const client = yield* TaxKitHttpApiService;
          const term = yield* DocsSearchTerm.makeEffect("calculator");
          assert.deepEqual(
            yield* client.content
              .searchPages({ query: { term } })
              .pipe(Effect.flip),
            new DocsSearchUnavailable({
              message: "Documentation search is temporarily unavailable.",
            })
          );
        }).pipe(
          Effect.provide(
            TaxKitApiInProcessClientLive.pipe(Layer.provide(controlled))
          )
        );
      }).pipe(Effect.provide(ContentTestLive), Effect.scoped)
  );

  it.effect(
    "interrupts the actual generated-client request and closes its service work",
    () =>
      Effect.gen(function* () {
        const live = yield* ContentService;
        const entered = yield* Deferred.make<boolean>();
        const closed = yield* Ref.make(false);
        const controlled = Layer.succeed(
          ContentService,
          ContentService.of({
            ...live,
            getPage: () =>
              Deferred.succeed(entered, true).pipe(
                Effect.andThen(Effect.never),
                Effect.ensuring(Ref.set(closed, true))
              ),
          })
        );
        yield* Effect.gen(function* () {
          const client = yield* TaxKitHttpApiService;
          const path = yield* DocsPagePath.makeEffect("/start/overview");
          const request = yield* client.content
            .getPage({ query: { path } })
            .pipe(Effect.forkScoped);
          yield* Deferred.await(entered);
          yield* Fiber.interrupt(request);
          assert.isTrue(yield* Ref.get(closed));
        }).pipe(
          Effect.provide(
            TaxKitApiInProcessClientLive.pipe(Layer.provide(controlled))
          )
        );
      }).pipe(Effect.provide(ContentTestLive), Effect.scoped)
  );
});
