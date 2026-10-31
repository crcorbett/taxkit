import "@tanstack/react-start/server-only";
import {
  createStartHandler,
  defaultStreamHandler,
} from "@tanstack/react-start/server";
import { applyCachePolicy } from "@taxkit/api-http/response-policy";
import { DiscoveryPath } from "@taxkit/api-http/routes";
import { observeHostRequest } from "@taxkit/observability/host-telemetry";
import type { HostRoute } from "@taxkit/observability/host-telemetry";
import { Effect, ErrorReporter, Match, Option, Schema } from "effect";
import {
  HttpServerError,
  HttpServerRequest,
  HttpServerResponse,
} from "effect/http";

import { earlyReply } from "./lib/http/early-reply.ingress";
import { withDocsRepresentation } from "./lib/http/negotiation.ingress";
import { runtime } from "./lib/runtime.server";

const render = createStartHandler(defaultStreamHandler);

// The closed route family for the one request record; the raw path and query
// never leave this function.
const websiteRoute = (pathname: string): HostRoute =>
  Match.value(pathname).pipe(
    Match.when(Schema.is(DiscoveryPath), () => "discovery" as const),
    Match.when(
      (path) => path.startsWith("/og/") && path.endsWith(".png"),
      () => "docs" as const
    ),
    Match.when(
      (path) => path === "/" || path.startsWith("/calculators/"),
      () => "calculator-page" as const
    ),
    Match.when("/search", () => "search" as const),
    Match.when(
      (path) => path === "/_serverFn" || path.startsWith("/_serverFn/"),
      () => "other" as const
    ),
    Match.orElse(() => "page" as const)
  );

// The Worker entry is server-only; the runtime never reaches a browser bundle.
const handleRequest = (request: Request) =>
  runtime.runPromise(
    Effect.gen(function* websiteRequest() {
      const early = yield* earlyReply;
      if (Option.isSome(early)) {
        return early.value;
      }
      return yield* Effect.gen(function* websiteHtml() {
        const incoming = yield* HttpServerRequest.HttpServerRequest;
        const htmlRequest = yield* HttpServerRequest.toWeb(incoming).pipe(
          Effect.orDie
        );
        return yield* Effect.promise(() =>
          Promise.resolve(render(htmlRequest))
        ).pipe(Effect.map(HttpServerResponse.fromWeb));
      }).pipe(withDocsRepresentation);
    }).pipe(
      // Native HTTP failure matching preserves aborts and safe empty errors.
      // The installed host reporter discards arbitrary Causes before logging.
      Effect.catchCause((cause) =>
        HttpServerError.causeResponse(cause).pipe(
          Effect.flatMap(([response, reportable]) =>
            ErrorReporter.report(reportable).pipe(Effect.as(response))
          )
        )
      ),
      // One cache decision for every reply. Public pages, Markdown and
      // discovery documents are shared; errors and anything setting a cookie
      // are not.
      Effect.map((response) =>
        applyCachePolicy(response, {
          method: request.method,
          publicRead: true,
        })
      ),
      // One fixed request record per Website request.
      observeHostRequest("taxkit-web", {
        method: request.method,
        route: websiteRoute(new URL(request.url).pathname),
      }),
      Effect.provideService(
        HttpServerRequest.HttpServerRequest,
        HttpServerRequest.fromWeb(request)
      ),
      Effect.scoped,
      Effect.map(HttpServerResponse.toWeb)
    ),
    { signal: request.signal }
  );

export default { fetch: handleRequest };
