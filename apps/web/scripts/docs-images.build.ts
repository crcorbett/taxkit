import { Renderer } from "@takumi-rs/wasm/node";
import { ContentCatalogueLive } from "@taxkit/content/live";
import { DocsNavigation } from "@taxkit/content/schemas";
import { ContentCatalogue, DocsSources } from "@taxkit/content/service";
import { DocsDiagramRendererLive } from "@taxkit/diagrams/mermaid";
import { DocsCodeHighlighterLive } from "@taxkit/mdx/highlights";
import { DocsPageReaderLive } from "@taxkit/mdx/live";
import { Array, Effect, FileSystem, Layer, Path, Schema } from "effect";

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

// Content builds the same checked catalogue the API serves, from the authored
// files its navigation lists. The image build and the native pair test read it.
export const readDocsCatalogue = Effect.gen(function* readDocsCatalogue() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const contentRoot = yield* path.fromFileUrl(
    new URL("../../../content/docs", import.meta.url)
  );
  return yield* ContentCatalogue.pipe(
    Effect.provide(
      ContentCatalogueLive.pipe(
        Layer.provide(
          Layer.effect(
            DocsSources,
            fs.readFileString(path.join(contentRoot, "navigation.json")).pipe(
              Effect.flatMap(
                Schema.decodeEffect(Schema.fromJsonString(DocsNavigation))
              ),
              Effect.flatMap((navigation) =>
                Effect.forEach(
                  Array.flatMap(navigation.primaryNavigation, (item) => [
                    item,
                    ...(item.pages ?? []),
                  ]),
                  (leaf) =>
                    fs
                      .readFileString(path.join(contentRoot, leaf.source))
                      .pipe(Effect.map((text) => ({ path: leaf.source, text })))
                )
              )
            )
          )
        ),
        Layer.provide(
          DocsPageReaderLive.pipe(
            Layer.provide(
              Layer.merge(DocsCodeHighlighterLive, DocsDiagramRendererLive)
            )
          )
        )
      )
    ),
    Effect.mapError(
      () =>
        new DocsImageBuildError({
          message: "Public documentation images could not be built.",
          stage: "catalogue",
        })
    )
  );
});

// This lazy build-only program writes the declared generated public/og folder.
// The Vite host alone supplies platform services and runs it.
export const generateDocsImages = Effect.gen(function* generateDocsImages() {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const publicRoot = yield* path.fromFileUrl(
    new URL("../public", import.meta.url)
  );
  const catalogue = yield* readDocsCatalogue;
  const renderer = yield* Effect.acquireRelease(
    Effect.sync(() => new Renderer()),
    (resource) =>
      Effect.sync(() => {
        resource.free();
      })
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
