import { Source, SourceId, SourceText } from "@taxkit/mdx/schemas";
import type {
  Inline,
  RenderedInline,
  RenderedBlock,
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

import { DocsPageReadError } from "./errors.js";
import { readingMarkdown } from "./reading-markdown.egress.js";
import { DocsPageFrontmatter, DocsReadingBody } from "./schemas.js";
import { DocsPageReader } from "./service.js";
// Content projects neutral checked semantics into the existing public wire shape.
const projectInline = (inline: RenderedInline) =>
  Match.value(inline).pipe(
    Match.when({ kind: "link" }, ({ content, href, kind }) => ({
      content,
      href,
      kind,
    })),
    Match.orElse((value) => value)
  );
const projectBlock = (input: RenderedBlock) =>
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
        const input = yield* Source.makeEffect({ id, text }).pipe(
          Effect.mapError(() => fail("syntax"))
        );
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
          .render({ ...document, blocks: body })
          .pipe(Effect.mapError((error) => fail(error.reason)));
        const checkedBody = yield* Schema.decodeUnknownEffect(
          Schema.toType(DocsReadingBody)
        )(EffectFunction.pipe(rendered.blocks, Array.map(projectBlock))).pipe(
          Effect.mapError(() => fail("body"))
        );
        return {
          body: checkedBody,
          frontmatter,
          markdown: readingMarkdown({
            body: rendered.blocks,
            title: frontmatter.title,
          }),
        };
      }),
    });
  })
);
