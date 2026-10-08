import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Array, Effect, FileSystem, Result, Schema } from "effect";

import { checkDopplerCustody } from "./doppler-custody.boundary.js";

const runCustodyFixture = (token: string, mode = 0o600) =>
  Effect.gen(function* custodyFixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const directory = yield* fileSystem.makeTempDirectoryScoped({
      prefix: "taxkit-doppler-custody-",
    });
    const repositoryRoot = `${directory}/repository`;
    const configPath = `${directory}/.doppler.yaml`;
    yield* fileSystem.makeDirectory(repositoryRoot);
    yield* fileSystem.writeFileString(
      configPath,
      `scoped:\n  ${Schema.encodeSync(Schema.fromJsonString(Schema.String))(repositoryRoot)}:\n    token: ${Schema.encodeSync(Schema.fromJsonString(Schema.String))(token)}\n`
    );
    yield* fileSystem.chmod(configPath, mode);
    return yield* Effect.result(
      checkDopplerCustody(repositoryRoot, configPath)
    );
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("Doppler local token custody", () => {
  test.effect("accepts a mode-0600 system-keyring reference", () =>
    Effect.gen(function* () {
      const result = yield* runCustodyFixture(
        "secret-00000000-0000-4000-8000-000000000000"
      );
      expect(result._tag).toBe("Success");
    })
  );

  test.effect(
    "rejects a raw token without retaining it in the typed error",
    () =>
      Effect.gen(function* () {
        const rawToken = "dp.st.raw-secret-fixture-that-must-not-appear";
        const result = yield* runCustodyFixture(rawToken);
        expect(result._tag).toBe("Failure");
        expect(String(result)).not.toContain(rawToken);
      })
  );

  test.effect("rejects a config readable by the group or other users", () =>
    Effect.gen(function* () {
      const result = yield* runCustodyFixture(
        "secret-00000000-0000-4000-8000-000000000000",
        0o644
      );
      expect(result._tag).toBe("Failure");
    })
  );

  test.effect("rejects a token scoped outside the repository", () =>
    Effect.gen(function* () {
      const fileSystem = yield* FileSystem.FileSystem;
      const directory = yield* fileSystem.makeTempDirectoryScoped({
        prefix: "taxkit-doppler-custody-scope-",
      });
      const repositoryRoot = `${directory}/repository`;
      const configPath = `${directory}/.doppler.yaml`;
      yield* fileSystem.makeDirectory(repositoryRoot);
      yield* fileSystem.writeFileString(
        configPath,
        'scoped:\n  "/another/repository":\n    token: "secret-00000000-0000-4000-8000-000000000000"\n'
      );
      yield* fileSystem.chmod(configPath, 0o600);
      const result = yield* Effect.exit(
        checkDopplerCustody(repositoryRoot, configPath)
      );
      expect(result._tag).toBe("Failure");
    }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
  test.effect("rejects an empty scoped token with its owning safe reason", () =>
    Effect.gen(function* () {
      const result = yield* runCustodyFixture("");
      Result.match(result, {
        onFailure: (error) => expect(error.reason).toBe("scoped-token"),
        onSuccess: () => expect.unreachable(),
      });
    })
  );

  test.effect.each([
    { nestedFirst: false, nestedValid: false },
    { nestedFirst: true, nestedValid: false },
    { nestedFirst: false, nestedValid: true },
    { nestedFirst: true, nestedValid: true },
  ])(
    "selects the most specific scope regardless of order: $nestedFirst/$nestedValid",
    ({ nestedFirst, nestedValid }) =>
      Effect.gen(function* () {
        const fileSystem = yield* FileSystem.FileSystem;
        const directory = yield* fileSystem.makeTempDirectoryScoped({
          prefix: "taxkit-custody-specific-",
        });
        const repositoryRoot = `${directory}/repository/nested`;
        const configPath = `${directory}/custody.yaml`;
        yield* fileSystem.makeDirectory(repositoryRoot, { recursive: true });
        const valid = "secret-00000000-0000-4000-8000-000000000000";
        const invalid = "dp.st.synthetic-raw-token-must-not-escape";
        const parent = [
          `${directory}/repository`,
          nestedValid ? invalid : valid,
        ] as const;
        const nested = [repositoryRoot, nestedValid ? valid : invalid] as const;
        const entries = nestedFirst ? [nested, parent] : [parent, nested];
        const lines = Array.map(
          entries,
          ([scope, token]) =>
            `  ${Schema.encodeSync(Schema.fromJsonString(Schema.String))(scope)}:\n    token: ${Schema.encodeSync(Schema.fromJsonString(Schema.String))(token)}\n`
        );
        yield* fileSystem.writeFileString(
          configPath,
          `scoped:\n${lines.join("")}`
        );
        yield* fileSystem.chmod(configPath, 0o600);
        const result = yield* checkDopplerCustody(
          repositoryRoot,
          configPath
        ).pipe(Effect.result);
        expect(Result.isSuccess(result)).toBe(nestedValid);
        Result.match(result, {
          onFailure: (error) => {
            expect(error.reason).toBe("system-keyring-reference");
            expect(String(error)).not.toContain(invalid);
          },
          onSuccess: () => expect(nestedValid).toBe(true),
        });
      }).pipe(Effect.scoped, Effect.provide(BunServices.layer))
  );
});
