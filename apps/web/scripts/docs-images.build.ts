import { Renderer } from "@takumi-rs/wasm/node";
import { DocsPublicCatalogue } from "@taxkit/content/schemas";
import { Effect, FileSystem, Path, Schema } from "effect";

import {
  docsImagePath,
  WebsiteDocsImageSize,
} from "../src/lib/docs/social.schemas";
import { WebsiteDocsImageBytes } from "./docs-images.schemas";

class DocsImageBuildError extends Schema.TaggedError<DocsImageBuildError>()(
  "DocsImageBuildError",
  {
    message: Schema.Literal("Public documentation images could not be built."),
    stage: Schema.Literals(["catalogue", "render", "image", "write"]),
  }
) {}

// This lazy build-only program writes the declared generated public/og folder.
// The Vite host alone supplies platform services and runs it. It reads the same
// checked catalogue; no authored source, fetched fonts or report is available.
export const generateDocsImages = Effect.gen(function* generateDocsImages() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const cataloguePath = yield* path.fromFileUrl(
    new URL(
      "../../../packages/docs-content/.source/public-catalogue.json",
      import.meta.url
    )
  );
  const publicRoot = yield* path.fromFileUrl(
    new URL("../public", import.meta.url)
  );
  const catalogue = yield* fs.readFileString(cataloguePath).pipe(
    Effect.flatMap(
      Schema.decodeEffect(Schema.fromJsonString(DocsPublicCatalogue))
    ),
    Effect.mapError(
      () =>
        new DocsImageBuildError({
          message: "Public documentation images could not be built.",
          stage: "catalogue",
        })
    )
  );
  const renderer = yield* Effect.acquireRelease(
    Effect.sync(() => new Renderer()),
    (resource) => Effect.sync(() => resource.free())
  );
  // Only this generator owns the ignored og subtree. Removing former generated
  // pages keeps withdrawn/draft content out of the copied public assets.
  yield* fs
    .remove(path.join(publicRoot, "og"), { force: true, recursive: true })
    .pipe(
      Effect.mapError(
        () =>
          new DocsImageBuildError({
            message: "Public documentation images could not be built.",
            stage: "write",
          })
      )
    );
  return yield* Effect.forEach(catalogue.pages, (page) =>
    Effect.gen(function* () {
      const bytes = yield* Effect.tryPromise({
        catch: () =>
          new DocsImageBuildError({
            message: "Public documentation images could not be built.",
            stage: "render",
          }),
        try: () =>
          renderer.render(
            {
              children: [
                {
                  style: { color: "#0b57d0", fontSize: 30, fontWeight: 600 },
                  text: "TaxKit · Developer docs",
                  type: "text",
                },
                {
                  children: [
                    {
                      style: {
                        fontSize: 64,
                        fontWeight: 700,
                        lineClamp: 3,
                        lineHeight: 1.08,
                        textOverflow: "ellipsis",
                        textWrap: "balance",
                      },
                      text: page.frontmatter.title,
                      type: "text",
                    },
                    {
                      style: {
                        fontSize: 28,
                        lineClamp: 3,
                        lineHeight: 1.35,
                        textOverflow: "ellipsis",
                      },
                      text: page.frontmatter.description,
                      type: "text",
                    },
                  ],
                  style: { display: "flex", flexDirection: "column", gap: 24 },
                  type: "container",
                },
                {
                  style: { color: "#475569", fontSize: 24 },
                  text: page.path,
                  type: "text",
                },
              ],
              style: {
                backgroundColor: "#f8fafc",
                color: "#172033",
                display: "flex",
                flexDirection: "column",
                fontFamily: "Geist",
                height: "100%",
                justifyContent: "space-between",
                padding: 64,
                width: "100%",
              },
              type: "container",
            },
            {
              ...WebsiteDocsImageSize,
              fontFamilies: ["Geist"],
              format: "png",
              lang: "en-AU",
            }
          ),
      }).pipe(
        Effect.flatMap((output) =>
          Schema.decodeEffect(WebsiteDocsImageBytes)(output).pipe(
            Effect.mapError(
              () =>
                new DocsImageBuildError({
                  message: "Public documentation images could not be built.",
                  stage: "image",
                })
            )
          )
        )
      );
      const address = docsImagePath(page);
      const destination = path.join(publicRoot, address.slice(1));
      yield* fs
        .makeDirectory(path.dirname(destination), { recursive: true })
        .pipe(
          Effect.andThen(fs.writeFile(destination, bytes)),
          Effect.mapError(
            () =>
              new DocsImageBuildError({
                message: "Public documentation images could not be built.",
                stage: "write",
              })
          )
        );
      return { bytes, path: address };
    })
  );
}).pipe(Effect.scoped);
