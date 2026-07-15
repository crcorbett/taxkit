import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@taxkit/docs-content/errors";
import { DocsContentPage, DocsNavigation } from "@taxkit/docs-content/schemas";
import {
  Array,
  Cause,
  Effect,
  Exit,
  Match,
  Result,
  Schema,
  SchemaIssue,
  pipe,
} from "effect";

import { DocsContentPreloadError, DocsRouteTransportError } from "./errors";

type SyncSchema = Schema.Top & {
  readonly DecodingServices: never;
  readonly EncodingServices: never;
};

type RouteBoundarySchemas<
  Success extends SyncSchema,
  Failure extends SyncSchema,
> = Readonly<{
  error: Failure;
  success: Success;
}>;

const DocsHomeLoaderSuccess = Schema.Struct({
  navigation: DocsNavigation,
  pages: Schema.Array(DocsContentPage),
});

const DocsPageLoaderSuccess = Schema.Struct({
  navigation: DocsNavigation,
  page: DocsContentPage,
});

const DocsLoaderError = Schema.Union([
  DocsContentPreloadError,
  DocsPageNotFoundError,
  DocsSourceError,
]);

const createRouteBoundary = <
  Success extends SyncSchema,
  Failure extends SyncSchema,
>(
  schemas: RouteBoundarySchemas<Success, Failure>
) => {
  const codec = Schema.toCodecJson(
    Schema.Exit(schemas.success, schemas.error, Schema.Never)
  );
  const encode = Schema.encodeEffect(codec);
  const formatSchemaIssue = SchemaIssue.makeFormatterDefault();

  return {
    codec,
    encodeExit: <R>(
      program: Effect.Effect<Success["Type"], Failure["Type"], R>
    ) =>
      Effect.exit(program).pipe(
        Effect.flatMap((exit) =>
          Match.value(exit).pipe(
            Match.when(Exit.isSuccess, (successExit) =>
              encode(successExit).pipe(Effect.orDie)
            ),
            Match.orElse((failureExit) =>
              Match.value(failureExit.cause).pipe(
                Match.when(Cause.hasDies, (cause) => Effect.failCause(cause)),
                Match.when(Cause.hasInterrupts, (cause) =>
                  Effect.failCause(cause)
                ),
                Match.orElse((cause) =>
                  pipe(
                    cause.reasons,
                    Array.filter(Cause.isFailReason),
                    Array.matchLeft({
                      onEmpty: () =>
                        Effect.die(
                          new Error(
                            "Docs route failure contained no expected error"
                          )
                        ),
                      onNonEmpty: (_failure, additionalFailures) =>
                        pipe(
                          additionalFailures,
                          Array.match({
                            onEmpty: () =>
                              encode(failureExit).pipe(Effect.orDie),
                            onNonEmpty: () =>
                              Effect.die(
                                new Error(
                                  "Docs route failure contained multiple expected errors"
                                )
                              ),
                          })
                        ),
                    })
                  )
                )
              )
            )
          )
        )
      ),
    restore: (encoded: unknown) =>
      Schema.decodeUnknownResult(codec)(encoded).pipe(
        Result.mapError(
          (error) =>
            new DocsRouteTransportError({
              message: formatSchemaIssue(error.issue),
            })
        ),
        Result.flatMap((exit) =>
          Match.value(exit).pipe(
            Match.when(Exit.isSuccess, ({ value }) => Result.succeed(value)),
            Match.orElse(({ cause }) =>
              Match.value(cause).pipe(
                Match.when(Cause.hasDies, () =>
                  Result.fail(
                    new DocsRouteTransportError({
                      message: "Decoded loader failure contained a defect",
                    })
                  )
                ),
                Match.when(Cause.hasInterrupts, () =>
                  Result.fail(
                    new DocsRouteTransportError({
                      message:
                        "Decoded loader failure contained an interruption",
                    })
                  )
                ),
                Match.orElse((expectedCause) =>
                  pipe(
                    expectedCause.reasons,
                    Array.filter(Cause.isFailReason),
                    Array.matchLeft({
                      onEmpty: () =>
                        Result.fail(
                          new DocsRouteTransportError({
                            message:
                              "Decoded loader failure contained no expected error",
                          })
                        ),
                      onNonEmpty: (failure, additionalFailures) =>
                        pipe(
                          additionalFailures,
                          Array.match({
                            onEmpty: () => Result.fail(failure.error),
                            onNonEmpty: () =>
                              Result.fail(
                                new DocsRouteTransportError({
                                  message:
                                    "Decoded loader failure contained multiple expected errors",
                                })
                              ),
                          })
                        ),
                    })
                  )
                )
              )
            )
          )
        )
      ),
  };
};

export const docsHomeRouteBoundary = createRouteBoundary({
  error: DocsLoaderError,
  success: DocsHomeLoaderSuccess,
});

export const docsPageRouteBoundary = createRouteBoundary({
  error: DocsLoaderError,
  success: DocsPageLoaderSuccess,
});
