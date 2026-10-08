import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Effect, Match, Option, Redacted, Result, Schema } from "effect";
import * as FileSystem from "effect/FileSystem";

import {
  readDocsDeploymentStateStoreCredentials,
  requireDocsDeploymentStateStoreAccount,
} from "./inventory-credentials.boundary.js";

const validCredentials = {
  accountId: "account-123",
  authToken: "secret-state-token",
  url: "https://state.example.test/v1/state",
};

const runCredentialRead = (
  fileSource: Option.Option<string>,
  environmentSource: Option.Option<string>
) =>
  Effect.gen(function* credentialFixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-inventory-credentials-",
    });
    const path = `${directory}/cloudflare-state-store.json`;
    yield* Option.match(fileSource, {
      onNone: () => Effect.void,
      onSome: (source) => fileSystem.writeFileString(path, source),
    });
    return yield* readDocsDeploymentStateStoreCredentials(
      path,
      environmentSource.pipe(Option.map(Redacted.make))
    ).pipe(Effect.result);
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("docs deployment state-store credential boundary", () => {
  test.effect(
    "decodes the exact cached credential Schema and keeps the token redacted",
    () =>
      Effect.gen(function* () {
        const result = yield* runCredentialRead(
          Option.some(
            Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(
              validCredentials
            )
          ),
          Option.none()
        );
        Result.match(result, {
          onFailure: () => expect.unreachable(),
          onSuccess: (credentials) => {
            expect(credentials.accountId).toBe("account-123");
            expect(credentials.url.hostname).toBe("state.example.test");
            expect(String(credentials.authToken)).toBe("<redacted>");
          },
        });
      })
  );

  test.effect(
    "uses a valid protected environment fallback when the cache is malformed",
    () =>
      Effect.gen(function* () {
        const result = yield* runCredentialRead(
          Option.some("{malformed"),
          Option.some(
            Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(
              validCredentials
            )
          )
        );
        expect(Result.isSuccess(result)).toBe(true);
      })
  );

  test.effect(
    "distinguishes absent credentials from malformed credentials",
    () =>
      Effect.gen(function* () {
        const [absent, malformed] = yield* Effect.all([
          runCredentialRead(Option.none(), Option.none()),
          runCredentialRead(
            Option.some(
              Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))({
                accountId: "account-123",
              })
            ),
            Option.none()
          ),
        ]);
        Result.match(absent, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("DocsDeploymentInventoryInputError", (failure) => {
                expect(failure.target).toBe(
                  "missing cached Cloudflare state-store credentials"
                );
                expect(failure.fileVisible).toBe(false);
                expect(failure.fileJsonObject).toBe(false);
              }),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });
        Result.match(malformed, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("DocsDeploymentInventoryInputError", (failure) => {
                expect(failure.target).toBe(
                  "invalid cached Cloudflare state-store credentials"
                );
                expect(failure.fileVisible).toBe(true);
                expect(failure.fileJsonObject).toBe(true);
              }),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });
      })
  );

  test.effect(
    "rejects excess credential fields and account mismatch without exposing secrets",
    () =>
      Effect.gen(function* () {
        const excess = yield* runCredentialRead(
          Option.some(
            Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))({
              ...validCredentials,
              leakedMetadata: "forbidden",
            })
          ),
          Option.none()
        );
        Result.match(excess, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("DocsDeploymentInventoryInputError", (failure) => {
                expect(
                  Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(
                    failure
                  )
                ).not.toContain("secret-state-token");
                expect(failure.target).toBe(
                  "invalid cached Cloudflare state-store credentials"
                );
              }),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });

        const mismatch = yield* requireDocsDeploymentStateStoreAccount(
          "another-account",
          {
            accountId: "account-123",
            authToken: Redacted.make("secret-state-token"),
            url: new URL("https://state.example.test/v1/state"),
          }
        ).pipe(Effect.result);
        Match.value(mismatch).pipe(
          Match.tag("Failure", ({ failure }) => {
            expect(failure.target).toBe("cached state-store account identity");
            expect(
              Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(failure)
            ).not.toContain("secret-state-token");
          }),
          Match.orElse(() => expect.unreachable())
        );
      })
  );
  test.effect(
    "keeps a valid cached credential ahead of the environment fallback",
    () =>
      Effect.gen(function* () {
        const result = yield* runCredentialRead(
          Option.some(
            Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(
              validCredentials
            )
          ),
          Option.some(
            Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))({
              ...validCredentials,
              accountId: "environment-account",
            })
          )
        );
        Result.match(result, {
          onFailure: () => expect.unreachable(),
          onSuccess: (credentials) =>
            expect(credentials.accountId).toBe("account-123"),
        });
      })
  );

  test.effect(
    "does not fall back after a visible but unreadable credential input",
    () =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const root = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-credential-unreadable-",
        });
        const source = `${root}/directory.json`;
        yield* fileSystem.makeDirectory(source);
        const result = yield* readDocsDeploymentStateStoreCredentials(
          source,
          Option.some(
            Redacted.make(
              Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))(
                validCredentials
              )
            )
          )
        ).pipe(Effect.result);
        Result.match(result, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("DocsDeploymentInventoryReadError", (failure) => {
                expect(failure.operation).toBe("state-credentials-file");
                expect(String(failure)).not.toContain("secret-state-token");
              }),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );

  test.effect.each(["null", "1", "true", '"TAXKIT_SECRET_SENTINEL"'])(
    "keeps malformed scalar receipt metadata bounded: %s",
    (source) =>
      Effect.gen(function* () {
        const result = yield* runCredentialRead(
          Option.some(source),
          Option.none()
        );
        Result.match(result, {
          onFailure: (error) =>
            Match.value(error).pipe(
              Match.tag("DocsDeploymentInventoryInputError", (failure) => {
                expect(failure.fileVisible).toBe(true);
                expect(failure.fileJsonObject).toBe(false);
                expect(failure.target).toBe(
                  "invalid cached Cloudflare state-store credentials"
                );
                expect(String(failure)).not.toContain("TAXKIT_SECRET_SENTINEL");
              }),
              Match.orElse(() => expect.unreachable())
            ),
          onSuccess: () => expect.unreachable(),
        });
      })
  );
});
