import { SourceId, SourceText } from "@taxkit/mdx/schemas";
import type {
  Source,
  Inline,
  RenderedInline,
  RenderedBlock,
  ReadingInline,
  ReadingBlock,
} from "@taxkit/mdx/schemas";
import { MdxCompiler, MdxRenderer } from "@taxkit/mdx/service";
import {
  Function as EffectFunction,
  Array,
  Effect,
  Layer,
  Match,
  Schema,
} from "effect";

import { DocsThemeConfig } from "./config.js";
import { DocsPageReadError } from "./errors.js";
import { writeReadingMarkdown } from "./reading-markdown.egress.js";
import { DocsPageFrontmatter, DocsReadingBody } from "./schemas.js";
import { DocsPageReader } from "./service.js";
// Content projects neutral checked semantics into the existing public wire shape.
const projectInline = (inline: RenderedInline): ReadingInline =>
  Match.value(inline).pipe(
    Match.when({ kind: "link" }, ({ content, href, kind }) => ({
      content,
      href,
      kind,
    })),
    Match.orElse((value) => value)
  );
const projectBlock = (input: RenderedBlock): ReadingBlock =>
  Match.value(input).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ kind, language, lines }) => ({ kind, language, lines }),
      diagram: (block) => block,
      heading: (block) => ({
        ...block,
        content: EffectFunction.pipe(block.content, Array.map(projectInline)),
      }),
      list: (block) => ({
        ...block,
        items: EffectFunction.pipe(
          block.items,
          Array.map((item) =>
            EffectFunction.pipe(item, Array.map(projectInline))
          )
        ),
      }),
      paragraph: (block) => ({
        ...block,
        content: EffectFunction.pipe(block.content, Array.map(projectInline)),
      }),
      table: (block) => ({
        ...block,
        header: EffectFunction.pipe(
          block.header,
          Array.map((cell) =>
            EffectFunction.pipe(cell, Array.map(projectInline))
          )
        ),
        rows: EffectFunction.pipe(
          block.rows,
          Array.map((row) =>
            EffectFunction.pipe(
              row,
              Array.map((cell) =>
                EffectFunction.pipe(cell, Array.map(projectInline))
              )
            )
          )
        ),
      }),
    })
  );
// Heading comparison follows the checked inline tree, including link labels.
const collectInlineText = (inline: Inline): string =>
  Match.value(inline).pipe(
    Match.discriminatorsExhaustive("kind")({
      text: ({ text }) => text,
      "inline-code": ({ text }) => text,
      strong: ({ content }) =>
        EffectFunction.pipe(
          content,
          Array.map(collectInlineText),
          Array.join("")
        ),
      emphasis: ({ content }) =>
        EffectFunction.pipe(
          content,
          Array.map(collectInlineText),
          Array.join("")
        ),
      link: ({ content }) =>
        EffectFunction.pipe(
          content,
          Array.map(collectInlineText),
          Array.join("")
        ),
    })
  );
export const ContentMdxReaderLive = Layer.effect(
  DocsPageReader,
  Effect.gen(function* () {
    const compiler = yield* MdxCompiler;
    const renderer = yield* MdxRenderer;
    const theme = yield* DocsThemeConfig;
    return DocsPageReader.of({
      read: Effect.fn("DocsPageReader.read")(function* (source) {
        const fail = (reason: DocsPageReadError["reason"]) =>
          new DocsPageReadError({
            message: "The authored page is invalid.",
            reason,
            source: source.path,
          });
        const id = yield* SourceId.makeEffect(source.path).pipe(
          Effect.mapError(() => fail("syntax"))
        );
        const text = yield* SourceText.makeEffect(source.text).pipe(
          Effect.mapError(() => fail("syntax"))
        );
        const input: Source = { id, text };
        const document = yield* compiler
          .compile(input)
          .pipe(Effect.mapError((error) => fail(error.reason)));
        const metadata = yield* Effect.fromOption(document.metadata).pipe(
          Effect.mapError(() => fail("frontmatter"))
        );
        const frontmatter = yield* Schema.decodeUnknownEffect(
          DocsPageFrontmatter
        )(metadata, { onExcessProperty: "error" }).pipe(
          Effect.mapError(() => fail("frontmatter"))
        );
        const [title, ...body] = document.blocks;
        if (
          title?.kind !== "heading" ||
          title.depth !== 1 ||
          body.length === 0 ||
          EffectFunction.pipe(
            body,
            Array.some((block) => block.kind === "heading" && block.depth === 1)
          )
        ) {
          return yield* fail("heading");
        }
        const headingText = EffectFunction.pipe(
          title.content,
          Array.map(collectInlineText),
          Array.join("")
        );
        if (headingText !== frontmatter.title) {
          return yield* fail("title");
        }
        const rendered = yield* renderer
          .render({ document: { ...document, blocks: body }, theme })
          .pipe(Effect.mapError((error) => fail(error.reason)));
        // Publication admits the narrower heading and link policies once;
        // the projection itself already carries the shared reading contract.
        const checkedBody = yield* Schema.decodeUnknownEffect(DocsReadingBody)(
          EffectFunction.pipe(rendered.blocks, Array.map(projectBlock))
        ).pipe(Effect.mapError(() => fail("body")));
        return {
          theme: rendered.theme,
          body: checkedBody,
          frontmatter,
          markdown: writeReadingMarkdown({
            body: rendered.blocks,
            title: frontmatter.title,
          }),
        };
      }),
    });
  })
);
