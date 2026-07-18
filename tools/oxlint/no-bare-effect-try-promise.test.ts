import { afterEach, describe, expect, test } from "bun:test";
import { Buffer } from "node:buffer";
import { rm } from "node:fs/promises";
import { join } from "node:path";

const repositoryRoot = join(import.meta.dir, "../..");
const oxlint = join(repositoryRoot, "node_modules/.bin/oxlint");
const temporaryFiles: string[] = [];

const runOxlint = (path: string) => {
  const result = Bun.spawnSync({
    cmd: [
      oxlint,
      "-c",
      "oxlint.config.ts",
      "--disable-nested-config",
      "--no-error-on-unmatched-pattern",
      path,
    ],
    cwd: repositoryRoot,
    stderr: "pipe",
    stdout: "pipe",
  });

  return {
    exitCode: result.exitCode,
    output: `${Buffer.from(result.stdout).toString("utf-8")}${Buffer.from(result.stderr).toString("utf-8")}`,
  };
};

const writeFixture = async (source: string) => {
  const path = join(
    repositoryRoot,
    `tools/oxlint/fixtures/.generated-try-promise-${crypto.randomUUID()}.ts`
  );

  temporaryFiles.push(path);
  await Bun.write(path, source);

  return path;
};

const diagnostics = (output: string) =>
  output.match(/effect\(no-bare-effect-try-promise\)/gu) ?? [];

afterEach(async () => {
  await Promise.all(
    temporaryFiles.splice(0).map((path) => rm(path, { force: true }))
  );
});

describe("effect/no-bare-effect-try-promise", () => {
  test("rejects canonical root, namespace, subpath, alias, destructured and reassigned calls", async () => {
    const fixture = await writeFixture(`
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
    const result = runOxlint(fixture);

    expect(result.exitCode).toBe(1);
    expect(diagnostics(result.output)).toHaveLength(6);
  });

  test("accepts direct arrow, function and method mappings plus unrelated shadowed locals", async () => {
    const fixture = await writeFixture(`
      import { Effect as Fx, Schema } from "effect";

      class BoundaryError extends Schema.TaggedErrorClass<BoundaryError>()(
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
    const result = runOxlint(fixture);

    expect(result.output).not.toContain("effect(no-bare-effect-try-promise)");
  });

  test("rejects options whose rejection mapping is not statically inline", async () => {
    const fixture = await writeFixture(`
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
    const result = runOxlint(fixture);

    expect(result.exitCode).toBe(1);
    expect(diagnostics(result.output)).toHaveLength(7);
  });
});
