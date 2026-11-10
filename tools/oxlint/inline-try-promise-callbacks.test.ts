import { fileURLToPath } from "node:url";

import * as BunServices from "@effect/platform-bun/BunServices";
import { describe, expect, it } from "@effect/vitest";
import { Function as EffectFunction, Effect } from "effect";

import { lintFiles, writeTemporaryLintFixture } from "./cli-fixture.js";

const writeFixture = (source: string) => {
  const fixtureDirectory = fileURLToPath(new URL("fixtures", import.meta.url));
  return writeTemporaryLintFixture({
    source,
    extension: "ts",
    directory: fixtureDirectory,
  });
};
const diagnostics = (output: string) =>
  output.match(/taxkit-effect\(inline-try-promise-callbacks\)/gu) ?? [];
const runOxlint = (path: string) =>
  lintFiles({
    paths: [path],
  });
const sharedDiagnostics = (output: string) =>
  output.match(/effect-conventions\(require-try-promise-catch\)/gu) ?? [];
describe("taxkit-effect/inline-try-promise-callbacks", () => {
  it.effect(
    "keeps the shared rule on root, namespace, subpath, alias and destructured calls",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture(`
      import * as EffectRoot from "effect";
      import { Effect as Fx } from "effect";
      import { tryPromise as subpathAttempt } from "effect/Effect";

      const aliasedAttempt = Fx.tryPromise;
      const { tryPromise: destructuredAttempt } = Fx;

      Fx.tryPromise(() => Promise.resolve("direct"));
      EffectRoot.Effect.tryPromise(() => Promise.resolve("namespace"));
      subpathAttempt(() => Promise.resolve("subpath"));
      aliasedAttempt(() => Promise.resolve("alias"));
      destructuredAttempt(() => Promise.resolve("destructured"));
    `);
        const result = yield* runOxlint(fixture);
        expect(result.exitCode).toBe(1);
        EffectFunction.pipe(sharedDiagnostics(result.output), (actual) => {
          expect(actual).toHaveLength(5);
        });
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
    "accepts direct arrow, function and method mappings plus unrelated shadowed locals",
    () =>
      Effect.gen(function* () {
        const fixture = yield* writeFixture(`
      import { Effect as Fx, Schema } from "effect";

      class BoundaryError extends Schema.TaggedError<BoundaryError, { readonly brand: unique symbol }>()(
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
          "taxkit-effect(inline-try-promise-callbacks)"
        );
      }).pipe(Effect.provide(BunServices.layer))
  );
  it.effect(
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
        // The shared rule owns a missing options object or key; this rule
        // owns extracted, undefined and spread callbacks.
        EffectFunction.pipe(diagnostics(result.output), (actual) => {
          expect(actual).toHaveLength(5);
        });
        EffectFunction.pipe(sharedDiagnostics(result.output), (actual) => {
          expect(actual).toHaveLength(3);
        });
      }).pipe(Effect.provide(BunServices.layer))
  );
});
