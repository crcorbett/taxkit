import "@tanstack/react-start/server-only";
import { DiscoveryPath, discoveryApiPath } from "@taxkit/api-http/routes";
import { Effect, Option, Schema } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";

import { WebsiteApi } from "../host/service";

// The Website's /sitemap.xml, /robots.txt and /llms*.txt. The API owns each
// finished document; forward it once, before TanStack renders any HTML.
export const discoveryRepresentation = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest;
  const url = HttpServerRequest.toURL(request);
  const path = url.pipe(
    Option.map(({ pathname }) => pathname),
    Option.filter(Schema.is(DiscoveryPath))
  );
  if (Option.isNone(path)) {
    return Option.none();
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return Option.some(
      HttpServerResponse.empty({
        headers: { allow: "GET, HEAD" },
        status: 405,
      })
    );
  }
  if (Option.exists(url, ({ search }) => search !== "")) {
    return Option.some(HttpServerResponse.empty({ status: 400 }));
  }
  const api = yield* WebsiteApi;
  return yield* api.forward(discoveryApiPath(path.value)).pipe(
    Effect.map(HttpServerResponse.fromWeb),
    Effect.catch(() =>
      Effect.succeed(HttpServerResponse.empty({ status: 503 }))
    ),
    Effect.asSome
  );
}).pipe(Effect.withSpan("Website.discoveryRepresentation"));
