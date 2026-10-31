import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { ApiReplyMismatch } from "@taxkit/api-http/errors";
import { DocsPageUnavailable } from "@taxkit/content/errors";
import { Match, Cause, Effect, Schema } from "effect";

import { WebsiteLoadError } from "../host/errors";

export const loadFailureStatus = <E>(
  cause: Cause.Cause<E>
): 404 | 500 | 503 => {
  if (
    Cause.hasDies(cause) ||
    Schema.is(ApiReplyMismatch)(Cause.squash(cause))
  ) {
    return 500;
  }
  return Match.value(Cause.squash(cause)).pipe(
    Match.when(Schema.is(DocsPageUnavailable), (): 404 => 404),
    Match.orElse((): 503 => 503)
  );
};
// Typed failures are translated once, to TanStack's native not-found or error
// handling. Cancellation stays interruption, and no Cause or URL is logged.
export const rejectRouteLoad = <E>(
  cause: Cause.Cause<E>
): Effect.Effect<never, E | NotFoundError | WebsiteLoadError> => {
  if (Cause.hasInterruptsOnly(cause)) {
    return Effect.failCause(cause);
  }
  const status = loadFailureStatus(cause);
  return Match.value(status).pipe(
    Match.when(404, () => Effect.fail(notFound())),
    Match.orElse((matchedValue) =>
      Effect.logWarning("Website page load failed").pipe(
        Effect.andThen(
          Effect.fail(new WebsiteLoadError({ status: matchedValue }))
        )
      )
    )
  );
};
