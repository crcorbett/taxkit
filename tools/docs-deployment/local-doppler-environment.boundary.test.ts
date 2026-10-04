import { expect, it as test } from "@effect/vitest";
import { ConfigProvider, Effect, Option, Result } from "effect";

import { readLocalDopplerEnvironment } from "./local-doppler-environment.boundary.js";

test.effect.each([
  { environment: {} },
  { environment: { A: "parent", A_B: "child", EMPTY: "" } },
  {
    environment: {
      A: "parent",
      A__B: "double",
      TRAILING_: "tail",
      __LEADING: "lead",
      lowercase: "case",
    },
  },
])(
  "restores each flat environment name and empty value: $environment",
  ({ environment }) =>
    Effect.gen(function* () {
      const provider = ConfigProvider.fromEnvRecord(environment, {
        preserveEmptyStrings: true,
      });
      expect(yield* readLocalDopplerEnvironment(provider)).toEqual(environment);
    })
);

test.effect("handles a missing environment node as an empty environment", () =>
  Effect.gen(function* () {
    const provider = ConfigProvider.make(() =>
      Effect.succeed(Option.getOrUndefined(Option.none<ConfigProvider.Node>()))
    );
    expect(yield* readLocalDopplerEnvironment(provider)).toEqual({});
  })
);

test.effect(
  "rejects a provider array instead of guessing flat environment keys",
  () =>
    Effect.gen(function* () {
      const result = yield* readLocalDopplerEnvironment(
        ConfigProvider.fromUnknown(["TAXKIT_SECRET_SENTINEL"])
      ).pipe(Effect.result);
      Result.match(result, {
        onFailure: (error) => {
          expect(error.reason).toBe("environment-shape");
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.unreachable(),
      });
    })
);

test.effect(
  "returns a safe environment-read error when the provider fails",
  () =>
    Effect.gen(function* () {
      const provider = ConfigProvider.make(() =>
        Effect.fail(
          new ConfigProvider.SourceError({ message: "TAXKIT_SECRET_SENTINEL" })
        )
      );
      const result = yield* readLocalDopplerEnvironment(provider).pipe(
        Effect.result
      );
      Result.match(result, {
        onFailure: (error) => {
          expect(error.reason).toBe("environment-read");
          expect(String(error)).not.toContain("TAXKIT_SECRET_SENTINEL");
        },
        onSuccess: () => expect.unreachable(),
      });
    })
);
