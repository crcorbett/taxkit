import { FumadocsSourceLoadError } from "@taxkit/docs-fumadocs/errors";
import type { FumadocsSourceOperation } from "@taxkit/docs-fumadocs/schemas";
import { Effect } from "effect";

import type { source } from "./server.js";

type GeneratedPage = ReturnType<typeof source.getPages>[number];
type GeneratedPageInput = Pick<GeneratedPage, "path" | "slugs"> & {
  readonly data: Pick<
    GeneratedPage["data"],
    "description" | "status" | "title" | "getText"
  >;
};

export const readGeneratedPage = Effect.fn("DocsGeneratedSource.readPage")(
  function* (page: GeneratedPageInput, operation: FumadocsSourceOperation) {
    const markdown = yield* Effect.tryPromise({
      catch: () =>
        new FumadocsSourceLoadError({
          message: "The generated page text could not be loaded.",
          operation,
        }),
      try: () => page.data.getText("processed"),
    });
    return {
      browserPath: page.path,
      frontmatter: {
        description: page.data.description,
        status: page.data.status,
        title: page.data.title,
      },
      markdown,
      slugs: page.slugs,
      sourcePath: `content/${page.path}`,
    };
  }
);
