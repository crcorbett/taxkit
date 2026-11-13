import * as BunRuntime from "@effect/platform-bun/BunRuntime";
import * as BunServices from "@effect/platform-bun/BunServices";
import {
  Function as EffectFunction,
  Array,
  Console,
  Effect,
  FileSystem,
  Match,
  Number,
  Option,
  Path,
  Record,
  Schema,
  Boolean as EffectBoolean,
} from "effect";
import type * as PlatformError from "effect/PlatformError";
import * as TypeScript from "typescript-ast";

class PackageAssemblyError extends Schema.TaggedError<
  PackageAssemblyError,
  {
    readonly brand: unique symbol;
  }
>()("PackageAssemblyError", {
  operation: Schema.Literals([
    "resolve-import",
    "resolve-library",
    "assemble-package",
  ]),
  specifier: Schema.optionalKey(Schema.String),
}) {}
const Dependencies = Schema.Record(Schema.String, Schema.String);
const LibraryManifest = Schema.Struct({
  // A library without runtime dependencies omits the field.
  dependencies: Dependencies.pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({}), {
      encodingStrategy: "omit",
    })
  ),
  exports: Schema.Record(
    Schema.String,
    Schema.String.check(Schema.isPattern(/^\.\/src\/.+\.ts$/u))
  ),
  name: Schema.String,
});
const SdkManifest = Schema.Struct({ devDependencies: Dependencies });
const ModuleReference = Schema.Struct({
  end: Schema.Finite,
  specifier: Schema.String,
  start: Schema.Finite,
});
type ModuleReference = typeof ModuleReference.Type;
// This compiler adapter visits module syntax only. Service identifiers,
// documentation strings and other literals must never be rewritten.
const moduleReferences = (
  source: TypeScript.SourceFile,
  node: TypeScript.Node = source
): readonly ModuleReference[] => {
  const literal = Match.value(node).pipe(
    Match.when(
      (value) =>
        TypeScript.isImportDeclaration(value) ||
        TypeScript.isExportDeclaration(value),
      (value) => value.moduleSpecifier
    ),
    Match.when(TypeScript.isImportTypeNode, (value) =>
      Match.value(value.argument).pipe(
        Match.when(
          TypeScript.isLiteralTypeNode,
          (argument) => argument.literal
        ),
        Match.orElse(EffectFunction.constUndefined)
      )
    ),
    Match.when(TypeScript.isCallExpression, (value) =>
      EffectBoolean.match(
        value.expression.kind === TypeScript.SyntaxKind.ImportKeyword,
        {
          onFalse: EffectFunction.constUndefined,
          onTrue: () => Array.head(value.arguments).pipe(Option.getOrUndefined),
        }
      )
    ),
    Match.orElse(EffectFunction.constUndefined)
  );
  const own = Option.fromNullishOr(literal).pipe(
    Option.filter(TypeScript.isStringLiteral),
    Option.filter((reference) => reference.text.startsWith("@taxkit/")),
    Option.map((reference) => ({
      end: reference.getEnd() - 1,
      specifier: reference.text,
      start: reference.getStart(source) + 1,
    })),
    Option.toArray
  );
  return Array.appendAll(
    own,
    EffectFunction.pipe(
      node.getChildren(source),
      Array.flatMap((child) => moduleReferences(source, child))
    )
  );
};
export const relocateModuleImports = (
  source: string,
  file: string,
  resolve: (specifier: string) => Option.Option<string>
) => {
  const parsed = TypeScript.createSourceFile(
    file,
    source,
    TypeScript.ScriptTarget.Latest,
    true
  );
  return Effect.forEach(moduleReferences(parsed), (reference) =>
    resolve(reference.specifier).pipe(
      Effect.fromOption,
      Effect.mapError(
        () =>
          new PackageAssemblyError({
            operation: "resolve-import",
            specifier: reference.specifier,
          })
      ),
      Effect.map((replacement) => ({ ...reference, replacement }))
    )
  ).pipe(
    Effect.map((references) =>
      EffectFunction.pipe(
        references,
        Array.sort((left: ModuleReference, right: ModuleReference) =>
          Number.Order(right.start, left.start)
        ),
        Array.reduce(
          source.replace(/\n\/\/# sourceMappingURL=.*$/u, ""),
          (text, reference) =>
            `${text.slice(0, reference.start)}${reference.replacement}${text.slice(reference.end)}`
        )
      )
    )
  );
};
interface Library {
  readonly directory: string;
  readonly manifest: typeof LibraryManifest.Type;
  readonly root: string;
}
// The private source owners compiled into the SDK are the workspace packages
// its own sources import, plus their workspace runtime dependencies. Each must
// be a workspace devDependency of the SDK; its manifest names its modules.
const bundledLibraries = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* path.fromFileUrl(
    new URL("../../../../", import.meta.url)
  );
  const sdk = yield* path.fromFileUrl(new URL("../", import.meta.url));
  const manifest = yield* fs
    .readFileString(path.join(sdk, "package.json"))
    .pipe(
      Effect.flatMap(Schema.decodeEffect(Schema.fromJsonString(SdkManifest)))
    );
  const workspace = EffectFunction.pipe(
    manifest.devDependencies,
    Record.filter((version) => version.startsWith("workspace:"))
  );
  const sources = yield* fs.readDirectory(path.join(sdk, "src"), {
    recursive: true,
  });
  const imported = yield* Effect.forEach(
    EffectFunction.pipe(
      sources,
      Array.filter((file) => file.endsWith(".ts"))
    ),
    (file) =>
      fs.readFileString(path.join(sdk, "src", file)).pipe(
        Effect.map((source) =>
          EffectFunction.pipe(
            TypeScript.createSourceFile(
              file,
              source,
              TypeScript.ScriptTarget.Latest,
              true
            ),
            moduleReferences,
            Array.map(({ specifier }) =>
              EffectFunction.pipe(specifier.split("/"), Array.take(2)).join("/")
            )
          )
        )
      )
  ).pipe(
    Effect.map((names) =>
      EffectFunction.pipe(names, Array.flatten, Array.dedupe)
    )
  );
  const visit = (
    pending: readonly string[],
    found: readonly Library[]
  ): Effect.Effect<
    readonly Library[],
    PackageAssemblyError | PlatformError.PlatformError | Schema.SchemaError
  > =>
    Array.match(pending, {
      onEmpty: () => Effect.succeed(found),
      onNonEmpty: ([name, ...rest]) =>
        EffectBoolean.match(
          EffectFunction.pipe(
            found,
            Array.some((library) => library.manifest.name === name)
          ),
          {
            onFalse: () =>
              Effect.gen(function* () {
                if (!Record.has(workspace, name)) {
                  return yield* new PackageAssemblyError({
                    operation: "resolve-library",
                    specifier: name,
                  });
                }
                const linked = yield* fs.realPath(
                  path.join(sdk, "node_modules", name)
                );
                const library = yield* fs
                  .readFileString(path.join(linked, "package.json"))
                  .pipe(
                    Effect.flatMap(
                      Schema.decodeEffect(
                        Schema.fromJsonString(LibraryManifest)
                      )
                    )
                  );
                const next = EffectFunction.pipe(
                  Record.keys(library.dependencies),
                  Array.filter((dependency) =>
                    dependency.startsWith("@taxkit/")
                  ),
                  (dependencies) => Array.appendAll(rest, dependencies)
                );
                const known = EffectFunction.pipe(
                  found,
                  Array.append({
                    directory: path.basename(linked),
                    manifest: library,
                    root: path.relative(root, linked),
                  })
                );
                return yield* visit(next, known);
              }),
            onTrue: () => visit(rest, found),
          }
        ),
    });
  return yield* visit(imported, []);
});
export const assemblePackage = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const destination = yield* path.fromFileUrl(
    new URL("../dist/", import.meta.url)
  );
  // tsc compiles the SDK and the private sources it imports in one program,
  // keeping their repository paths under .compiled.
  const compiled = yield* path.fromFileUrl(
    new URL("../.compiled/", import.meta.url)
  );
  const owners = yield* bundledLibraries;
  const modules = Record.fromEntries(
    EffectFunction.pipe(
      owners,
      Array.flatMap((owner) =>
        EffectFunction.pipe(
          Record.toEntries(owner.manifest.exports),
          Array.map(
            ([key, target]) =>
              [
                `${owner.manifest.name}${Match.value(key).pipe(
                  Match.when(".", (): "" => ""),
                  Match.orElse((matchedValue) => matchedValue.slice(1))
                )}`,
                path.join(
                  destination,
                  "internal",
                  owner.directory,
                  path.relative("src", target).replace(/\.ts$/u, ".js")
                ),
              ] as const
          )
        )
      )
    )
  );
  const inputs = Array.prepend(
    EffectFunction.pipe(
      owners,
      Array.map((owner) => ({
        from: path.join(compiled, owner.root, "src"),
        to: path.join(destination, "internal", owner.directory),
      }))
    ),
    {
      from: path.join(compiled, "packages/sdk/typescript/src"),
      to: destination,
    }
  );
  yield* Effect.forEach(
    inputs,
    (input) =>
      Effect.gen(function* () {
        const files = yield* fs.readDirectory(input.from, { recursive: true });
        yield* Effect.forEach(
          EffectFunction.pipe(
            files,
            Array.filter(
              (file) => file.endsWith(".js") || file.endsWith(".d.ts")
            )
          ),
          (file) =>
            Effect.gen(function* () {
              const target = path.join(input.to, file);
              const contents = yield* fs.readFileString(
                path.join(input.from, file)
              );
              const relocated = yield* relocateModuleImports(
                contents,
                file,
                (specifier) =>
                  Record.get(modules, specifier).pipe(
                    Option.map((module) => {
                      const relative = path
                        .relative(path.dirname(target), module)
                        .split(path.sep)
                        .join("/");
                      return EffectBoolean.match(relative.startsWith("."), {
                        onFalse: () => `./${relative}`,
                        onTrue: () => relative,
                      });
                    })
                  )
              );
              yield* fs.makeDirectory(path.dirname(target), {
                recursive: true,
              });
              yield* fs.writeFileString(target, relocated);
            }),
          { discard: true }
        );
      }),
    { discard: true }
  );
  yield* fs.remove(compiled, { recursive: true });
  yield* Console.info(
    "Assembled one SDK package with internal JavaScript and declarations."
  );
}).pipe(
  Effect.mapError((error) =>
    Match.value(error).pipe(
      Match.tag("PackageAssemblyError", (failure) => failure),
      Match.orElse(
        () =>
          new PackageAssemblyError({
            operation: "assemble-package",
          })
      )
    )
  )
);
if (import.meta.main) {
  BunRuntime.runMain(assemblePackage.pipe(Effect.provide(BunServices.layer)));
}
