import {
  Effect,
  FileSystem,
  Path,
  Record,
  Function as EffectFunction,
} from "effect";
// Every module in one built Worker folder: JavaScript chunks as ES modules and
// any WebAssembly as compiled modules. Tests read the
// JavaScript text; Miniflare needs both.
export const readWorkerModules = Effect.fnUntraced(function* ({
  modulesRoot,
}: {
  readonly modulesRoot: string;
}) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fs.glob("**/*.js", { root: modulesRoot });
  const modules = Record.fromEntries(
    yield* EffectFunction.pipe(
      files,
      Effect.forEach((file) =>
        fs
          .readFileString(path.join(modulesRoot, file))
          .pipe(
            Effect.map(
              (contents) => [file, { contents, type: "esm" as const }] as const
            )
          )
      )
    )
  );
  const wasm = Record.fromEntries(
    yield* EffectFunction.pipe(
      yield* fs.glob("**/*.wasm", { root: modulesRoot }),
      Effect.forEach((file) =>
        fs
          .readFile(path.join(modulesRoot, file))
          .pipe(
            Effect.map(
              (bytes) =>
                [
                  file,
                  { contents: new Uint8Array(bytes), type: "wasm" as const },
                ] as const
            )
          )
      )
    )
  );
  return { files, modules, wasm };
});
