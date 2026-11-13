import { notFound } from "@tanstack/react-router";
import type { NotFoundError } from "@tanstack/react-router";
import { Function as EffectFunction, Effect, Match, Record } from "effect";

import { WebsiteLoadError } from "../host/errors";

/**
 * Every translated route load fails with TanStack's native not-found or one
 * safe status. Native redirects pass through unchanged.
 */
export type RouteLoadFailure = NotFoundError | WebsiteLoadError;

// What one expected failure means to a visitor: a missing page, an invalid
// reply or view (500), or a service that cannot answer now (503).
type RouteLoadOutcome = "missing" | "invalid-reply" | "unavailable";

/**
 * Builds the `Effect.catchTags` handlers for one loader's closed error union,
 * keyed by each error tag. A loader declares its result type, so a tag it does
 * not list is a type error. Each failed load writes one checked warning with
 * its tag and reason, never its Cause, message or URL.
 */
export const routeLoadFailures = <
  const Table extends Readonly<Record<string, RouteLoadOutcome>>,
>(
  table: Table
) =>
  EffectFunction.pipe(
    table,
    Record.map<
      keyof Table & string,
      RouteLoadOutcome,
      () => Effect.Effect<never, RouteLoadFailure>
    >(
      (outcome, errorTag) => () =>
        Match.value(outcome).pipe(
          Match.when("missing", () => Effect.fail(notFound())),
          Match.orElse((reason) =>
            Effect.logWarning("Website page load failed").pipe(
              Effect.annotateLogs({
                errorTag,
                event: "website.load.failed",
                reason,
              }),
              Effect.andThen(
                Effect.fail(
                  new WebsiteLoadError({
                    status: Match.value(reason).pipe(
                      Match.when("unavailable", (): 503 => 503),
                      Match.orElse((): 500 => 500)
                    ),
                  })
                )
              )
            )
          )
        )
    )
  );

/**
 * A defect stays a defect. It is logged once with the same checked record and
 * then carries only the safe 500 value, so TanStack never receives the
 * original Cause. Interruption is untouched.
 */
export const withSafeDefects = <A, E, R>(
  self: Effect.Effect<A, E, R>
): Effect.Effect<A, E, R> =>
  self.pipe(
    Effect.catchDefect(() =>
      Effect.logWarning("Website page load failed").pipe(
        Effect.annotateLogs({
          errorTag: "Defect",
          event: "website.load.failed",
          reason: "defect",
        }),
        Effect.andThen(Effect.die(new WebsiteLoadError({ status: 500 })))
      )
    )
  );
