import * as BunServices from "@effect/platform-bun/BunServices";
import { Effect, FileSystem, Schema } from "effect";
import { describe, expect, test } from "vitest";

import { runLocalDocsWithDoppler } from "./local-doppler.js";

const FakeReceipt = Schema.Struct({
  arguments: Schema.Array(Schema.String),
  environment: Schema.Struct({
    CLOUDFLARE_ACCOUNT_ID: Schema.optional(Schema.String),
    CLOUDFLARE_API_TOKEN: Schema.optional(Schema.String),
    DOPPLER_CONFIG: Schema.optional(Schema.String),
    DOPPLER_PROJECT: Schema.optional(Schema.String),
    DOPPLER_TOKEN: Schema.optional(Schema.String),
    TAXKIT_DOPPLER_TEST_MARKER: Schema.String,
  }),
});

const runFakeDoppler = (exitCode: number) =>
  Effect.gen(function* fakeDoppler() {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-local-doppler-",
    });
    const executable = `${directory}/doppler`;
    const receiptPath = `${directory}/receipt.json`;
    yield* fileSystem.writeFileString(
      executable,
      `#!/usr/bin/env bun
await Bun.write(process.env.TAXKIT_DOPPLER_TEST_RECEIPT, JSON.stringify({
  arguments: process.argv.slice(2),
  environment: {
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
    DOPPLER_CONFIG: process.env.DOPPLER_CONFIG,
    DOPPLER_PROJECT: process.env.DOPPLER_PROJECT,
    DOPPLER_TOKEN: process.env.DOPPLER_TOKEN,
    TAXKIT_DOPPLER_TEST_MARKER: process.env.TAXKIT_DOPPLER_TEST_MARKER,
  },
}));
process.exit(${exitCode});
`
    );
    yield* fileSystem.chmod(executable, 0o700);
    const result = yield* Effect.exit(
      runLocalDocsWithDoppler(executable, {
        CLOUDFLARE_ACCOUNT_ID: "ambient-account-must-not-pass",
        CLOUDFLARE_API_TOKEN: "ambient-provider-secret-must-not-pass",
        DOPPLER_CONFIG: "ambient-config-must-not-pass",
        DOPPLER_PROJECT: "ambient-project-must-not-pass",
        DOPPLER_TOKEN: "ambient-bridge-secret-must-not-pass",
        PATH: process.env["PATH"],
        TAXKIT_DOPPLER_TEST_MARKER: "retained-safe-marker",
        TAXKIT_DOPPLER_TEST_RECEIPT: receiptPath,
      }).pipe(Effect.scoped)
    );
    const receipt = yield* fileSystem
      .readFileString(receiptPath)
      .pipe(
        Effect.flatMap(
          Schema.decodeUnknownEffect(Schema.fromJsonString(FakeReceipt))
        )
      );
    return { receipt, result };
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("local Doppler docs adapter", () => {
  test("uses the fixed project, config and fail-closed child arguments", () =>
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
    }).pipe(Effect.runPromise));

  test("returns a typed failure when Doppler refuses the request", () =>
    Effect.gen(function* () {
      const { result } = yield* runFakeDoppler(1);
      expect(result._tag).toBe("Failure");
      if (result._tag === "Failure") {
        expect(result.cause.reasons[0]?._tag).toBe("Fail");
      }
    }).pipe(Effect.runPromise));
});
