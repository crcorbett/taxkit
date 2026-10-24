import "@tanstack/react-start/server-only";
import { docsImageApiPath } from "@taxkit/api-http/routes";
import { DocsPngBytes, DocsPublicPagePath } from "@taxkit/content/schemas";
import { Effect, Option, Record, Schema } from "effect";
import { Headers, HttpServerRequest, HttpServerResponse } from "effect/http";

import { WebsiteApi } from "../host/service";

const imagePattern = /^\/og(?<page>\/.+)\.png$/u;
const unavailable = HttpServerResponse.empty({
  headers: { "cache-control": "no-store" },
  status: 503,
});

// A published page's share image. The API owns the prebuilt PNG; the
// Website forwards its own /og/<page>.png address once and checks the bytes.
export const docsImageRepresentation = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const page = HttpServerRequest.toURL(request).pipe(
    Option.flatMap((url) =>
      Option.fromNullishOr(imagePattern.exec(url.pathname)?.groups)
    ),
    Option.flatMap(Record.get("page")),
    Option.flatMap(Option.fromNullishOr)
  );
  if (Option.isNone(page)) {
    return Option.none();
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Option.some(
      HttpServerResponse.empty({
        headers: { allow: "GET, HEAD", "cache-control": "no-store" },
        status: 405,
      })
    );
  }
  const path = Schema.decodeUnknownOption(DocsPublicPagePath)(page.value);
  if (Option.isNone(path)) {
    return Option.some(
      HttpServerResponse.empty({
        headers: { "cache-control": "no-store" },
        status: 404,
      })
    );
  }
  const api = yield* WebsiteApi;
  return yield* api.forward(docsImageApiPath(path.value)).pipe(
    Effect.map(HttpServerResponse.fromWeb),
    Effect.flatMap((response) => {
      if (response.status === 404) {
        return Effect.succeed(
          HttpServerResponse.empty({
            headers: { "cache-control": "no-store" },
            status: 404,
          })
        );
      }
      if (
        response.status !== 200 ||
        !Option.contains(
          Headers.get(response.headers, "content-type"),
          "image/png"
        )
      ) {
        return Effect.succeed(unavailable);
      }
      return HttpServerResponse.toClientResponse(response).arrayBuffer.pipe(
        Effect.map((buffer) => new Uint8Array(buffer)),
        Effect.flatMap(Schema.decodeEffect(DocsPngBytes)),
        Effect.map((bytes) =>
          request.method === "HEAD"
            ? HttpServerResponse.empty({
                headers: { "content-type": "image/png" },
                status: 200,
              })
            : HttpServerResponse.uint8Array(bytes, {
                contentType: "image/png",
                headers: { "x-content-type-options": "nosniff" },
              })
        )
      );
    }),
    Effect.catch(() => Effect.succeed(unavailable)),
    Effect.asSome
  );
}).pipe(Effect.withSpan("Website.docsImageRepresentation"));
