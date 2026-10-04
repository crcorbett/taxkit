import * as BunServices from "@effect/platform-bun/BunServices";
import { Effect, Match, Option, Redacted, Result } from "effect";
import * as FileSystem from "effect/FileSystem";
import { describe, expect, test } from "vitest";

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
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer), Effect.runPromise);

describe("docs deployment state-store credential boundary", () => {
  test("decodes the exact cached credential Schema and keeps the token redacted", async () => {
    const result = await runCredentialRead(
      Option.some(JSON.stringify(validCredentials)),
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
  });

  test("uses a valid protected environment fallback when the cache is malformed", async () => {
    const result = await runCredentialRead(
      Option.some("{malformed"),
      Option.some(JSON.stringify(validCredentials))
    );
    expect(Result.isSuccess(result)).toBe(true);
  });

  test("distinguishes absent credentials from malformed credentials", async () => {
    const [absent, malformed] = await Promise.all([
      runCredentialRead(Option.none(), Option.none()),
      runCredentialRead(
        Option.some(JSON.stringify({ accountId: "account-123" })),
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
  });

  test("rejects excess credential fields and account mismatch without exposing secrets", async () => {
    const excess = await runCredentialRead(
      Option.some(
        JSON.stringify({ ...validCredentials, leakedMetadata: "forbidden" })
      ),
      Option.none()
    );
    Result.match(excess, {
      onFailure: (error) =>
        Match.value(error).pipe(
          Match.tag("DocsDeploymentInventoryInputError", (failure) => {
            expect(JSON.stringify(failure)).not.toContain("secret-state-token");
            expect(failure.target).toBe(
              "invalid cached Cloudflare state-store credentials"
            );
          }),
          Match.orElse(() => expect.unreachable())
        ),
      onSuccess: () => expect.unreachable(),
    });

    const mismatch = await requireDocsDeploymentStateStoreAccount(
      "another-account",
      {
        accountId: "account-123",
        authToken: Redacted.make("secret-state-token"),
        url: new URL("https://state.example.test/v1/state"),
      }
    ).pipe(Effect.result, Effect.runPromise);
    Match.value(mismatch).pipe(
      Match.tag("Failure", ({ failure }) => {
        expect(failure.target).toBe("cached state-store account identity");
        expect(JSON.stringify(failure)).not.toContain("secret-state-token");
      }),
      Match.orElse(() => expect.unreachable())
    );
  });
});
