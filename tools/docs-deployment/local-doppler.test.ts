import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import {
  Config,
  Effect,
  FileSystem,
  Match,
  Path,
  Result,
  Schema,
} from "effect";

import { FakeDopplerReceipt } from "./fixtures/fake-doppler.schemas.js";
import { runLocalDocsWithDoppler } from "./local-doppler.js";

const runFakeDoppler = (exitCode: number) =>
  Effect.gen(function* fakeDoppler() {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-local-doppler-",
    });
    const executable = `${directory}/doppler`;
    const receiptPath = `${directory}/receipt.json`;
    const path = yield* Path.Path;
    const fixture = yield* path.fromFileUrl(
      new URL("fixtures/fake-doppler.runtime.ts", import.meta.url)
    );
    yield* fileSystem.symlink(fixture, executable);
    const searchPath = yield* Config.String("PATH");
    const result = yield* Effect.result(
      runLocalDocsWithDoppler(executable, {
        CLOUDFLARE_ACCOUNT_ID: "ambient-account-must-not-pass",
        CLOUDFLARE_API_TOKEN: "ambient-provider-secret-must-not-pass",
        DOPPLER_CONFIG: "ambient-config-must-not-pass",
        DOPPLER_PROJECT: "ambient-project-must-not-pass",
        DOPPLER_TOKEN: "ambient-bridge-secret-must-not-pass",
        PATH: searchPath,
        TAXKIT_DOPPLER_TEST_EXIT_CODE: String(exitCode),
        TAXKIT_DOPPLER_TEST_MARKER: "retained-safe-marker",
        TAXKIT_DOPPLER_TEST_RECEIPT: receiptPath,
      }).pipe(Effect.scoped)
    );
    const receipt = yield* fileSystem
      .readFileString(receiptPath)
      .pipe(
        Effect.flatMap(
          Schema.decodeEffect(Schema.fromJsonString(FakeDopplerReceipt))
        )
      );
    return { receipt, result };
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("local Doppler docs adapter", () => {
  test.effect(
    "uses the fixed project, config and fail-closed child arguments",
    () =>
      Effect.gen(function* () {
        const { receipt, result } = yield* runFakeDoppler(0);
        expect(result._tag).toBe("Success");
        expect(receipt.arguments).toEqual([
          "--no-read-env",
          "--no-check-version",
          "--silent",
          "run",
          "--project",
          "taxkit",
          "--config",
          "dev",
          "--no-fallback",
          "--only-secrets",
          "CLOUDFLARE_ACCOUNT_ID,CLOUDFLARE_API_TOKEN",
          "--",
          "bun",
          "run",
          "--no-env-file",
          "docs:dev:cloudflare:internal",
        ]);
        expect(receipt.environment).toEqual({
          TAXKIT_DOPPLER_TEST_MARKER: "retained-safe-marker",
        });
      })
  );

  test.effect("returns a typed failure when Doppler refuses the request", () =>
    Effect.gen(function* () {
      const { result } = yield* runFakeDoppler(1);
      Result.match(result, {
        onFailure: (error) =>
          Match.value(error).pipe(
            Match.tag("LocalDopplerCommandError", (failure) =>
              expect(failure.reason).toBe("process-exit")
            ),
            Match.exhaustive
          ),
        onSuccess: () => expect.unreachable(),
      });
    })
  );
});
