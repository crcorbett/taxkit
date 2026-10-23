import repository from "@content/docs/repository.json" with { type: "json" };
import { docsSources } from "@content/docs/sources";
import { NodeServices } from "@effect/platform-node";
import { assert, describe, it } from "@effect/vitest";
import { Array, Effect, FileSystem, Option, Stream } from "effect";
import { ChildProcess } from "effect/process";

// Each copied guide fence must equal its compiled, tested example file.
const snippets = [
  {
    example: "src/browser-http.ts",
    page: "guides/build-a-browser-app-with-the-http-api.mdx",
  },
  { example: "src/api-error-envelope.ts", page: "api/errors.mdx" },
  {
    example: "src/calculator-help.ts",
    page: "guides/show-calculator-help-to-users.mdx",
  },
  {
    example: "src/validate-external-input.ts",
    page: "guides/handle-validation-errors.mdx",
  },
  { example: "src/validate-external-input.ts", page: "sdk/type-safety.mdx" },
  {
    example: "src/define-gross-pay-fact.ts",
    page: "contributing/add-a-fact.mdx",
  },
  {
    example: "test/integration.example.test.ts",
    page: "guides/test-your-integration.mdx",
  },
] as const;

// Docs link these files at the recorded revision; that revision must still
// hold exactly the checked bytes.
const linkedExamples = [
  "src/api-error-envelope.ts",
  "src/browser-http.ts",
  "src/calculator-help.ts",
  "src/define-gross-pay-fact.ts",
  "src/effect.ts",
  "src/error-handling.ts",
  "src/node-server.ts",
  "src/validate-external-input.ts",
  "test/integration.example.test.ts",
] as const;

describe("published examples", () => {
  it.effect("copies each checked example into its guide unchanged", () =>
    Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      yield* Effect.forEach(snippets, ({ example, page }) =>
        Effect.gen(function* () {
          const source = yield* fs.readFileString(example);
          const text = Array.findFirst(
            docsSources,
            (candidate) => candidate.path === page
          ).pipe(
            Option.map((candidate) => candidate.text),
            Option.getOrElse(() => "")
          );
          assert.include(text, `\`\`\`ts\n${source.trim()}\n\`\`\``, page);
        })
      );
    }).pipe(Effect.provide(NodeServices.layer))
  );

  it.effect("matches the examples at the revision the docs link to", () =>
    Effect.forEach(linkedExamples, (example) =>
      Effect.gen(function* () {
        const fs = yield* FileSystem.FileSystem;
        const path = `packages/docs-examples/${example}`;
        const handle = yield* ChildProcess.make(
          "git",
          ["show", `${repository.checkedExampleRevision}:${path}`],
          { cwd: "../..", stderr: "ignore", stdin: "ignore", stdout: "pipe" }
        );
        const [chunks, exitCode] = yield* Effect.all(
          [Stream.runCollect(handle.stdout), handle.exitCode],
          { concurrency: "unbounded" }
        );
        assert.strictEqual(Number(exitCode), 0, path);
        assert.deepEqual(
          Array.flatMap(chunks, Array.fromIterable),
          Array.fromIterable(yield* fs.readFile(example)),
          path
        );
      }).pipe(Effect.scoped)
    ).pipe(Effect.provide(NodeServices.layer))
  );
});
