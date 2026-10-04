import { Array, Effect, Match, Option, Record, Schema } from "effect";
import type { ConfigProvider } from "effect";

import { LocalDopplerEnvironmentError } from "./local-doppler.schemas.js";

const LocalDopplerEnvironment = Schema.Record(Schema.String, Schema.String);

// Env providers expose an underscore-separated tree. Preserve both A and A_B,
// empty values and leading/repeated underscores when restoring flat child env.
export const readLocalDopplerEnvironment = (
  provider: ConfigProvider.ConfigProvider
) => {
  const readNode = (
    path: readonly string[]
  ): Effect.Effect<
    readonly (readonly [string, string])[],
    LocalDopplerEnvironmentError
  > =>
    provider.load(path).pipe(
      Effect.mapError(
        () => new LocalDopplerEnvironmentError({ reason: "environment-read" })
      ),
      Effect.flatMap((node) =>
        Option.fromNullishOr(node).pipe(
          Option.match({
            onNone: () => Effect.succeed([]),
            onSome: (present) =>
              Match.value(present).pipe(
                Match.tag("Value", ({ value }) =>
                  Effect.succeed([[path.join("_"), value] as const])
                ),
                Match.tag("Record", ({ keys, value }) =>
                  Effect.forEach(
                    Array.fromIterable(keys),
                    (key) => readNode([...path, key]),
                    { concurrency: 1 }
                  ).pipe(
                    Effect.map((children) => [
                      ...Option.toArray(
                        Option.fromNullishOr(value).pipe(
                          Option.map((scalar): readonly [string, string] => [
                            path.join("_"),
                            scalar,
                          ])
                        )
                      ),
                      ...Array.flatten(children),
                    ])
                  )
                ),
                Match.tag("Array", () =>
                  Effect.fail(
                    new LocalDopplerEnvironmentError({
                      reason: "environment-shape",
                    })
                  )
                ),
                Match.exhaustive
              ),
          })
        )
      )
    );
  return readNode([]).pipe(
    Effect.map(Record.fromEntries),
    Effect.flatMap((environment) =>
      Schema.decodeEffect(LocalDopplerEnvironment)(environment).pipe(
        Effect.mapError(
          () =>
            new LocalDopplerEnvironmentError({ reason: "environment-shape" })
        )
      )
    )
  );
};
