import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@whattax/docs-content/errors";
import { DocsContentPage, DocsNavigation } from "@whattax/docs-content/schemas";
import { Cause, Effect, Exit, Match, Option, Result, Schema } from "effect";

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

type RouteBoundaryHandlers<Success, Failure, OnSuccess, OnFailure> = Readonly<{
  onFailure: (error: Failure) => OnFailure;
  onSuccess: (value: Success) => OnSuccess;
}>;

const matchRouteBoundaryExit = <Success, Failure, OnSuccess, OnFailure>(
  exit: Exit.Exit<Success, Failure>,
  handlers: RouteBoundaryHandlers<Success, Failure, OnSuccess, OnFailure>
) =>
  Match.value(exit).pipe(
    Match.when(Exit.isSuccess, (successExit) =>
      handlers.onSuccess(successExit.value)
    ),
    Match.orElse((failureExit) =>
      Cause.findErrorOption(failureExit.cause).pipe(
        Option.match({
          onNone: () => {
            throw new Error("docs route boundary error invariant violated");
          },
          onSome: handlers.onFailure,
        })
      )
    )
  );

export class DocsContentPreloadError extends Schema.TaggedErrorClass<DocsContentPreloadError>()(
  "DocsContentPreloadError",
  {
    message: Schema.String,
    path: Schema.String,
  }
) {}

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
    Schema.Exit(schemas.success, schemas.error, Schema.Defect)
  );
  const decode = Schema.decodeUnknownSync(codec);
  const encode = Schema.encodeSync(codec);

  return {
    codec,
    decode,
    encodeExit: <R>(
      program: Effect.Effect<Success["Type"], Failure["Type"], R>
    ) =>
      Effect.exit(program).pipe(
        Effect.flatMap((exit) =>
          Match.value(exit).pipe(
            Match.when(Exit.isSuccess, () => Effect.sync(() => encode(exit))),
            Match.orElse((failureExit) => {
              const defect = Cause.findDefect(failureExit.cause);
              return Match.value(Result.isSuccess(defect)).pipe(
                Match.when(true, () => Effect.die(Result.getOrThrow(defect))),
                Match.orElse(() =>
                  Cause.findErrorOption(failureExit.cause).pipe(
                    Option.match({
                      onNone: () =>
                        Effect.die(new Error(Cause.pretty(failureExit.cause))),
                      onSome: () => Effect.sync(() => encode(failureExit)),
                    })
                  )
                )
              );
            })
          )
        )
      ),
    match: <OnSuccess, OnFailure>(
      encoded: unknown,
      handlers: RouteBoundaryHandlers<
        Success["Type"],
        Failure["Type"],
        OnSuccess,
        OnFailure
      >
    ) => matchRouteBoundaryExit(decode(encoded), handlers),
    matchExit: matchRouteBoundaryExit,
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
