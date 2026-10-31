import { DocsSourceError } from "@taxkit/content/errors";
import type { DocsLinkContext } from "@taxkit/content/links";
import type { DocsSource } from "@taxkit/content/schemas";
import type {
  DocsCodeHighlighter,
  DocsDiagramRenderer,
} from "@taxkit/content/service";
import { DocsPageReader } from "@taxkit/content/service";
import { Effect, Layer } from "effect";

import { readBody } from "./body.ingress.js";
import { readMdx } from "./mdx.ingress.js";
import { plainText } from "./schemas.js";
// Reads Content's authored MDX. The Layer requires Content's highlighter and
// diagram renderer, so the API chooses their implementations.
export const DocsPageReaderLive = Layer.effect(
  DocsPageReader,
  Effect.gen(function* () {
    const services = yield* Effect.context<
      DocsCodeHighlighter | DocsDiagramRenderer
    >();
    return DocsPageReader.of({
      read: Effect.fn("DocsPageReader.read")(function* ({
        source,
        links,
      }: {
        readonly source: DocsSource;
        readonly links: DocsLinkContext;
      }) {
        const { frontmatter, root } = yield* readMdx(source);
        const [title, ...blocks] = root.children;
        if (plainText(title.children) !== frontmatter.title) {
          return yield* new DocsSourceError({
            message: "The page # heading must match its frontmatter title.",
            operation: "parse",
            source: source.path,
          });
        }
        return {
          body: yield* readBody({
            blocks,
            links,
          }),
          frontmatter,
        };
      }, Effect.provideContext(services)),
    });
  })
);
