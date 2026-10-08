import { Effect, Match, Option, Predicate, Redacted, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";

import {
  DocsDeploymentInventoryInputError,
  DocsDeploymentInventoryReadError,
  DocsDeploymentStateStoreCredentials,
} from "./inventory.schemas.js";

const JsonValue = Schema.fromJsonString(Schema.Unknown);
const StateStoreCredentialsJson = Schema.fromJsonString(
  DocsDeploymentStateStoreCredentials
);

const decodeCredentials = (source: string) =>
  Schema.decodeEffect(StateStoreCredentialsJson, {
    onExcessProperty: "error",
  })(source).pipe(Effect.option);

export const readDocsDeploymentStateStoreCredentials = (
  path: string,
  environmentJson: Option.Option<Redacted.Redacted<string>>
): Effect.Effect<
  DocsDeploymentStateStoreCredentials,
  DocsDeploymentInventoryInputError | DocsDeploymentInventoryReadError,
  FileSystem.FileSystem
> =>
  Effect.gen(function* readStateStoreCredentialsAtBoundary() {
    const fileSystem = yield* FileSystem.FileSystem;
    const fileContents = yield* fileSystem.readFileString(path).pipe(
      Effect.map(Option.some),
      Effect.catchTag("PlatformError", (error) =>
        Match.value(error.reason).pipe(
          Match.tag("NotFound", () => Effect.succeed(Option.none<string>())),
          Match.orElse(
            () =>
              new DocsDeploymentInventoryReadError({
                operation: "state-credentials-file",
              })
          )
        )
      )
    );
    const fileJson = yield* Option.match(fileContents, {
      onNone: () => Effect.succeed(Option.none<typeof Schema.Unknown.Type>()),
      onSome: (source) =>
        Schema.decodeEffect(JsonValue)(source).pipe(Effect.option),
    });
    const fileJsonObject = Option.exists(fileJson, Predicate.isObject);
    const fileCredentials = yield* Option.match(fileJson, {
      onNone: () => Effect.succeed(Option.none()),
      onSome: (value) =>
        Schema.decodeUnknownEffect(DocsDeploymentStateStoreCredentials, {
          onExcessProperty: "error",
        })(value).pipe(Effect.option),
    });

    if (Option.isSome(fileCredentials)) {
      return fileCredentials.value;
    }

    const environmentCredentials = yield* Option.match(environmentJson, {
      onNone: () => Effect.succeed(Option.none()),
      onSome: (source) => decodeCredentials(Redacted.value(source)),
    });
    if (Option.isSome(environmentCredentials)) {
      return environmentCredentials.value;
    }

    return yield* new DocsDeploymentInventoryInputError({
      fileJsonObject,
      fileVisible: Option.isSome(fileContents),
      target:
        Option.isSome(fileContents) || Option.isSome(environmentJson)
          ? "invalid cached Cloudflare state-store credentials"
          : "missing cached Cloudflare state-store credentials",
    });
  });

export const requireDocsDeploymentStateStoreAccount = (
  expectedAccountId: string,
  credentials: DocsDeploymentStateStoreCredentials
): Effect.Effect<
  DocsDeploymentStateStoreCredentials,
  DocsDeploymentInventoryInputError
> =>
  credentials.accountId === expectedAccountId
    ? Effect.succeed(credentials)
    : new DocsDeploymentInventoryInputError({
        target: "cached state-store account identity",
      });
