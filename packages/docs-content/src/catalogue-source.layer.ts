import { makeFumadocsSourceLive } from "@taxkit/docs-fumadocs/live";
import { plugin } from "bun";
import { Effect, Layer, Path } from "effect";
import { loader } from "fumadocs-core/source";
import { createMdxPlugin } from "fumadocs-mdx/bun";

import { DocsSourceError } from "./errors.js";
import { createGeneratedCollectionAdapter } from "./generated-collection.boundary.js";

// This Layer belongs only to the local catalogue build command. The installed
// SDK owns compiler I/O and Bun requires plugin registration in that process.
// The independent default index never overwrites the retained Vite index.
export const DocsCatalogueSourceLive = Layer.unwrap(
  Effect.gen(function* () {
    const path = yield* Path.Path;
    const configPath = yield* path.fromFileUrl(
      new URL("../source.config.ts", import.meta.url)
    );
    const outDir = yield* path.fromFileUrl(
      new URL("../.source/catalogue", import.meta.url)
    );
    const compilerReady = yield* Effect.try({
      catch: () =>
        new DocsSourceError({
          message: "The catalogue compiler could not be prepared.",
          operation: "read",
        }),
      try: () => plugin(createMdxPlugin({ configPath, macro: false, outDir })),
    });
    // Bun returns no value for a synchronous setup, or the setup Promise.
    // The selected Fumadocs plugin uses asynchronous setup; await it before import.
    if (compilerReady !== undefined) {
      yield* Effect.tryPromise({
        catch: () =>
          new DocsSourceError({
            message: "The catalogue compiler could not be prepared.",
            operation: "read",
          }),
        try: () => compilerReady,
      });
    }
    const generated = yield* Effect.tryPromise({
      catch: () =>
        new DocsSourceError({
          message: "The catalogue source index could not be loaded.",
          operation: "read",
        }),
      try: () => import("../.source/catalogue/server.js"),
    });
    const source = yield* Effect.try({
      catch: () =>
        new DocsSourceError({
          message: "The catalogue source could not be loaded.",
          operation: "read",
        }),
      try: () =>
        loader({ baseUrl: "", source: generated.docs.toFumadocsSource() }),
    });
    return makeFumadocsSourceLive(createGeneratedCollectionAdapter(source));
  }).pipe(
    Effect.mapError(
      () =>
        new DocsSourceError({
          message: "The catalogue compiler source could not be loaded.",
          operation: "read",
        })
    )
  )
);
