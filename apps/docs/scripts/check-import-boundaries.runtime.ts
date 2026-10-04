import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import ts from "@typescript/typescript6";
import {
  Array,
  Console,
  Effect,
  FileSystem,
  Match,
  Path,
  Schema,
} from "effect";

class DocsImportReadError extends Schema.TaggedError<DocsImportReadError>()(
  "DocsImportReadError",
  {
    operation: Schema.Literals([
      "app-root",
      "source-list",
      "source-file",
      "source-stat",
      "browser-runtime",
    ]),
  }
) {}
class DocsImportPolicyError extends Schema.TaggedError<DocsImportPolicyError>()(
  "DocsImportPolicyError",
  { failures: Schema.Array(Schema.String) }
) {}

const serverOnlyModulePattern =
  /(?:@taxkit\/docs-content\/(?:generated-source|live|server|service|test|validate)|@taxkit\/docs-fumadocs\/(?:live|service|test)|#\/lib\/runtime\.server|\.\/runtime\.server)/u;
const runtimeExecutionPattern =
  /\b(?:ManagedRuntime|Runtime)\.|\bEffect\.run(?:Fork|Promise|PromiseExit|Sync)\b/u;

export const checkDocsImportBoundaries = (appRoot: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const sourceRoot = path.join(appRoot, "src");
    const paths = yield* fs
      .readDirectory(sourceRoot, { recursive: true })
      .pipe(
        Effect.mapError(
          () => new DocsImportReadError({ operation: "source-list" })
        )
      );
    const browserPaths = Array.filter(
      paths,
      (relativePath) =>
        /\.(?:js|jsx|ts|tsx)$/u.test(relativePath) &&
        !Array.some(relativePath.split(path.sep), (segment) =>
          segment.startsWith(".")
        ) &&
        !relativePath.endsWith(".server.ts") &&
        !relativePath.endsWith(".server.tsx") &&
        !relativePath.includes(".test.") &&
        relativePath !== "server.ts" &&
        relativePath !== "routeTree.gen.ts"
    );
    const findings = yield* Effect.forEach(browserPaths, (relativePath) =>
      fs.stat(path.join(sourceRoot, relativePath)).pipe(
        Effect.mapError(
          () => new DocsImportReadError({ operation: "source-stat" })
        ),
        Effect.flatMap((info) =>
          info.type === "File"
            ? fs.readFileString(path.join(sourceRoot, relativePath)).pipe(
                Effect.mapError(
                  () => new DocsImportReadError({ operation: "source-file" })
                ),
                Effect.map((source) => {
                  // TypeScript owns this parser and its checked AST node predicates.
                  // This checks direct static references, separately from bundle proof.
                  const sourceFile = ts.createSourceFile(
                    relativePath,
                    source,
                    ts.ScriptTarget.Latest,
                    true
                  );
                  const imports = Array.flatMap(
                    sourceFile.statements,
                    (statement) =>
                      (ts.isImportDeclaration(statement) ||
                        ts.isExportDeclaration(statement)) &&
                      statement.moduleSpecifier !== undefined &&
                      ts.isStringLiteral(statement.moduleSpecifier) &&
                      serverOnlyModulePattern.test(
                        statement.moduleSpecifier.text
                      )
                        ? [
                            `${relativePath} statically imports a server-only docs module: ${statement.moduleSpecifier.text}`,
                          ]
                        : []
                  );
                  return runtimeExecutionPattern.test(source)
                    ? Array.append(
                        imports,
                        `${relativePath} executes an Effect runtime from browser-reachable source.`
                      )
                    : imports;
                })
              )
            : Effect.succeed([])
        )
      )
    );
    const hasBrowserRuntime = yield* fs
      .exists(path.join(sourceRoot, "lib/runtime.client.ts"))
      .pipe(
        Effect.mapError(
          () => new DocsImportReadError({ operation: "browser-runtime" })
        )
      );
    const failures = hasBrowserRuntime
      ? Array.append(
          Array.flatten(findings),
          "The docs app must not own a browser Effect runtime at src/lib/runtime.client.ts."
        )
      : Array.flatten(findings);
    return yield* Match.value(failures.length).pipe(
      Match.when(0, () =>
        Console.info("Docs server/browser import boundaries passed.")
      ),
      Match.orElse(() => Effect.fail(new DocsImportPolicyError({ failures })))
    );
  });

if (import.meta.main) {
  BunRuntime.runMain(
    Effect.gen(function* () {
      const path = yield* Path.Path;
      const appRoot = yield* path
        .fromFileUrl(new URL("..", import.meta.url))
        .pipe(
          Effect.mapError(
            () => new DocsImportReadError({ operation: "app-root" })
          )
        );
      yield* checkDocsImportBoundaries(appRoot);
    }).pipe(
      Effect.tapErrorTag("DocsImportPolicyError", (error) =>
        Effect.forEach(error.failures, Console.error)
      ),
      Effect.provide(BunServices.layer)
    )
  );
}
