import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import { Cause, Effect, Schema } from "effect";

import { WebsiteLoadError } from "../host/errors";

export const loadFailureStatus = <E>(cause: Cause.Cause<E>): 404 | 503 =>
  Schema.is(DocsPageUnavailable)(Cause.squash(cause)) ? 404 : 503;

// Typed failures are translated once, to TanStack's native not-found or error
// handling. Cancellation stays interruption, and no Cause or URL is logged.
export const rejectRouteLoad = <E>(
  cause: Cause.Cause<E>
): Effect.Effect<never, E | NotFoundError | WebsiteLoadError> => {
  if (Cause.hasInterruptsOnly(cause)) {
    return Effect.failCause(cause);
  }
  return loadFailureStatus(cause) === 404
    ? Effect.fail(notFound())
    : Effect.logWarning("Website page load failed").pipe(
        Effect.andThen(Effect.fail(new WebsiteLoadError({ status: 503 })))
      );
};
