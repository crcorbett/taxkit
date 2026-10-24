import "@tanstack/react-start/server-only";
import { Effect, Option } from "effect";
import { HttpServerRequest, HttpServerResponse } from "effect/http";

import { discoveryRepresentation } from "./discovery.ingress";
import { docsImageRepresentation } from "./image.ingress";

// The framework still mounts its server-function base. The Website declares
// no server functions, so every such address is absent.
const serverFunctionBase = HttpServerRequest.HttpServerRequest.pipe(
  Effect.map((request) =>
    HttpServerRequest.toURL(request).pipe(
      Option.filter(
        ({ pathname }) =>
          pathname === "/_serverFn" || pathname.startsWith("/_serverFn/")
      ),
      Option.map(() => HttpServerResponse.empty({ status: 404 }))
    )
  )
);

/**
 * The reply the Website gives before TanStack renders HTML, if any: forwarded
 * discovery documents and share images, then the empty server-function base.
 */
export const earlyReply = discoveryRepresentation.pipe(
  Effect.flatMap((discovery) =>
    Option.isSome(discovery)
      ? Effect.succeed(discovery)
      : docsImageRepresentation
  ),
  Effect.flatMap((image) =>
    Option.isSome(image) ? Effect.succeed(image) : serverFunctionBase
  ),
  Effect.withSpan("Website.earlyReply")
);
