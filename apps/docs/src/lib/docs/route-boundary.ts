import {
  DocsPageNotFoundError,
  DocsSourceError,
} from "@whattax/docs-content/errors";
import { DocsContentPage, DocsNavigation } from "@whattax/docs-content/schemas";
import {
  Cause,
  Effect,
  Exit,
  Match,
  Option,
  Result,
  Schema,
  SchemaIssue,
} from "effect";

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

const toRouteResult = <Success, Failure>(exit: Exit.Exit<Success, Failure>) =>
  Match.value(exit).pipe(
    Match.when(Exit.isSuccess, (successExit) =>
      Result.succeed(successExit.value)
    ),
    Match.orElse((failureExit) =>
      Cause.findErrorOption(failureExit.cause).pipe(
        Option.match({
          onNone: () => {
            throw new Error("docs route boundary error invariant violated");
          },
          onSome: Result.fail,
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

class DocsRouteTransportError extends Schema.TaggedErrorClass<DocsRouteTransportError>()(
  "DocsRouteTransportError",
  {
    message: Schema.String,
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
  const encode = Schema.encodeSync(codec);

  return {
    codec,
    decodeToResult: (encoded: unknown) =>
      Schema.decodeUnknownResult(codec)(encoded).pipe(
        Result.mapError(
          (error) =>
            new DocsRouteTransportError({
              message: SchemaIssue.makeFormatterDefault()(error),
            })
        ),
        Result.flatMap(toRouteResult)
      ),
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
