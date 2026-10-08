import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it as test } from "@effect/vitest";
import { Effect } from "effect";

import { lintFiles, writeTemporaryLintFixture } from "./cli-fixture.js";

const writeFixture = (source: string) =>
  writeTemporaryLintFixture(
    source,
    "ts",
    fileURLToPath(new URL("fixtures", import.meta.url))
  );
const diagnostics = (output: string) =>
  output.match(/effect\(no-bare-effect-try-promise\)/gu) ?? [];
const runOxlint = (path: string) => lintFiles([path]);
describe("effect/no-bare-effect-try-promise", () => {
  test.effect(
    "rejects canonical root, namespace, subpath, alias, destructured and reassigned calls",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture(`
      import * as EffectRoot from "effect";
      import { Effect as Fx } from "effect";
      import { tryPromise as subpathAttempt } from "effect/Effect";

      const aliasedAttempt = Fx.tryPromise;
      const { tryPromise: destructuredAttempt } = Fx;
      let reassignedAttempt = (value) => value;
      reassignedAttempt = Fx.tryPromise;

      Fx.tryPromise(() => Promise.resolve("direct"));
      EffectRoot.Effect.tryPromise(() => Promise.resolve("namespace"));
      subpathAttempt(() => Promise.resolve("subpath"));
      aliasedAttempt(() => Promise.resolve("alias"));
      destructuredAttempt(() => Promise.resolve("destructured"));
      reassignedAttempt(() => Promise.resolve("reassigned"));
    `);
        const result = yield* runOxlint(fixture);
        expect(result.exitCode).toBe(1);
        expect(diagnostics(result.output)).toHaveLength(6);
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "accepts direct arrow, function and method mappings plus unrelated shadowed locals",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture(`
      import { Effect as Fx, Schema } from "effect";

      class BoundaryError extends Schema.TaggedError<BoundaryError>()(
        "BoundaryError",
        { message: Schema.String }
      ) {}

      const Effect = {
        tryPromise: (attempt) => attempt(),
      };
      let canonicalAttempt = Fx.tryPromise;
      canonicalAttempt = Effect.tryPromise;

      Fx.tryPromise({
        catch: (cause) => new BoundaryError({ message: String(cause) }),
        try: () => Promise.resolve("mapped"),
      });
      Fx.tryPromise({
        catch: function (cause) {
          return new BoundaryError({ message: String(cause) });
        },
        try: function () {
          return Promise.resolve("function-mapped");
        },
      });
      Fx.tryPromise({
        catch(cause) {
          return new BoundaryError({ message: String(cause) });
        },
        try() {
          return Promise.resolve("method-mapped");
        },
      });
      Effect.tryPromise(() => Promise.resolve("shadowed"));
      canonicalAttempt(() => Promise.resolve("cleared"));
    `);
        const result = yield* runOxlint(fixture);
        expect(result.output).not.toContain(
          "effect(no-bare-effect-try-promise)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  test.effect(
    "rejects options whose rejection mapping is not statically inline",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture(`
      import { Effect } from "effect";

      const options = {
        catch: (cause) => cause,
        try: () => Promise.resolve("indirect"),
      };
      const providerOperation = () => Promise.resolve("extracted");
      const sharedMapper = (cause) => cause;
      const tryOperation = providerOperation;

      Effect.tryPromise(options);
      Effect.tryPromise({ try: () => Promise.resolve("missing-catch") });
      Effect.tryPromise({
        catch: sharedMapper,
        try: providerOperation,
      });
      Effect.tryPromise({
        catch: undefined,
        try: () => Promise.resolve("undefined-catch"),
      });
      Effect.tryPromise({ catch: sharedMapper, try: tryOperation });
      Effect.tryPromise({ ...options });
      Effect.tryPromise({
        catch: (cause) => cause,
        try: () => Promise.resolve("spread-override"),
        ...options,
      });
    `);
        const result = yield* runOxlint(fixture);
        expect(result.exitCode).toBe(1);
        expect(diagnostics(result.output)).toHaveLength(7);
      }).pipe(Effect.provide(BunServices.layer))
  );
});
