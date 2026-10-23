import { Effect, FileSystem, Path, Record } from "effect";

// Every module in one built Worker folder: JavaScript chunks as ES modules and
// WebAssembly (the API's code highlighter) as compiled modules. Tests read the
// JavaScript text; Miniflare needs both.
export const readWorkerModules = Effect.fnUntraced(function* (
  modulesRoot: string
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const files = yield* fs.glob("**/*.js", { root: modulesRoot });
  const modules = Record.fromEntries(
    yield* Effect.forEach(files, (file) =>
      fs
        .readFileString(path.join(modulesRoot, file))
        .pipe(
          Effect.map(
            (contents) => [file, { contents, type: "esm" as const }] as const
          )
        )
    )
  );
  const wasm = Record.fromEntries(
    yield* Effect.forEach(
      yield* fs.glob("**/*.wasm", { root: modulesRoot }),
      (file) =>
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
  );
  return { files, modules, wasm };
});
