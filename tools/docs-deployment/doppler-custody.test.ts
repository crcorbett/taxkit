import * as BunServices from "@effect/platform-bun/BunServices";
import { Effect, FileSystem } from "effect";
import { describe, expect, test } from "vitest";

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
      `scoped:\n  ${JSON.stringify(repositoryRoot)}:\n    token: ${JSON.stringify(token)}\n`
    );
    yield* fileSystem.chmod(configPath, mode);
    return yield* Effect.exit(checkDopplerCustody(repositoryRoot, configPath));
  }).pipe(Effect.scoped, Effect.provide(BunServices.layer));

describe("Doppler local token custody", () => {
  test("accepts a mode-0600 system-keyring reference", () =>
    Effect.gen(function* () {
      const result = yield* runCustodyFixture(
        "secret-00000000-0000-4000-8000-000000000000"
      );
      expect(result._tag).toBe("Success");
    }).pipe(Effect.runPromise));

  test("rejects a raw token without retaining it in the typed error", () =>
    Effect.gen(function* () {
      const rawToken = "dp.st.raw-secret-fixture-that-must-not-appear";
      const result = yield* runCustodyFixture(rawToken);
      expect(result._tag).toBe("Failure");
      expect(String(result)).not.toContain(rawToken);
    }).pipe(Effect.runPromise));

  test("rejects a config readable by the group or other users", () =>
    Effect.gen(function* () {
      const result = yield* runCustodyFixture(
        "secret-00000000-0000-4000-8000-000000000000",
        0o644
      );
      expect(result._tag).toBe("Failure");
    }).pipe(Effect.runPromise));

  test("rejects a token scoped outside the repository", () =>
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
    }).pipe(
      Effect.scoped,
      Effect.provide(BunServices.layer),
      Effect.runPromise
    ));
});
