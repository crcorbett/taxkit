import * as Array from "effect/Array";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Option from "effect/Option";
import * as Path from "effect/Path";
import * as Record from "effect/Record";
import * as Schema from "effect/Schema";
import { parse } from "yaml";

import {
  DopplerCustodyError,
  DopplerUserConfig,
} from "./local-doppler.schemas.js";

const KeyringReference = Schema.String.check(
  Schema.isPattern(/^secret-[a-z0-9-]+$/iu)
);

const readDopplerConfig = (configPath: string) =>
  Effect.gen(function* readConfig() {
    const fileSystem = yield* FileSystem.FileSystem;
    const info = yield* fileSystem
      .stat(configPath)
      .pipe(
        Effect.mapError(
          () => new DopplerCustodyError({ reason: "config-file" })
        )
      );
    if (info.mode % 0o100 !== 0) {
      return yield* new DopplerCustodyError({ reason: "config-mode" });
    }
    const contents = yield* fileSystem
      .readFileString(configPath)
      .pipe(
        Effect.mapError(
          () => new DopplerCustodyError({ reason: "config-file" })
        )
      );
    const unknownConfig = yield* Effect.try({
      catch: () => new DopplerCustodyError({ reason: "config-shape" }),
      try: (): typeof Schema.Unknown.Type => parse(contents),
    });
    return yield* Schema.decodeUnknownEffect(DopplerUserConfig)(
      unknownConfig
    ).pipe(
      Effect.mapError(() => new DopplerCustodyError({ reason: "config-shape" }))
    );
  });

export const checkDopplerCustody = (
  repositoryRoot: string,
  configPath: string
) =>
  Effect.gen(function* dopplerCustody() {
    const path = yield* Path.Path;
    const config = yield* readDopplerConfig(configPath);
    const root = `${path.resolve(repositoryRoot)}${path.sep}`;
    const token = Option.map(
      Array.reduce(
        Record.toEntries(config.scoped),
        Option.none<{ readonly scopeLength: number; readonly token: string }>(),
        (selected, entry) => {
          const [scope, options] = entry;
          const normalizedScope = `${path.resolve(scope)}${path.sep}`;
          const scopedToken = Option.fromNullishOr(options.token).pipe(
            Option.filter((value) => value.length > 0)
          );
          if (!root.startsWith(normalizedScope)) {
            return selected;
          }
          return Option.match(scopedToken, {
            onNone: () => selected,
            onSome: (candidate) =>
              Option.match(selected, {
                onNone: () =>
                  Option.some({
                    scopeLength: normalizedScope.length,
                    token: candidate,
                  }),
                onSome: (current) =>
                  normalizedScope.length > current.scopeLength
                    ? Option.some({
                        scopeLength: normalizedScope.length,
                        token: candidate,
                      })
                    : selected,
              }),
          });
        }
      ),
      (selected) => selected.token
    );
    const selectedToken = yield* token.pipe(
      Effect.fromOption,
      Effect.mapError(() => new DopplerCustodyError({ reason: "scoped-token" }))
    );
    yield* Schema.decodeEffect(KeyringReference)(selectedToken).pipe(
      Effect.mapError(
        () => new DopplerCustodyError({ reason: "system-keyring-reference" })
      )
    );
  });
