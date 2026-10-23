import { DocsSourceError } from "@taxkit/content/errors";
import { resolveDocsHref } from "@taxkit/content/links";
import type { DocsLinkContext } from "@taxkit/content/links";
import {
  DocsCodeLanguage,
  DocsDiagramSource,
  DocsDiagramTitle,
  DocsHeadingId,
  DocsReadingBody,
} from "@taxkit/content/schemas";
import type { DocsBlock, DocsInline } from "@taxkit/content/schemas";
import {
  DocsCodeHighlighter,
  DocsDiagramRenderer,
} from "@taxkit/content/service";
import { Array, Effect, Match, Option, Schema } from "effect";

import { plainText } from "./schemas.js";
import type {
  SyntaxBlock,
  SyntaxFormatted,
  SyntaxLeaf,
  SyntaxPhrasing,
  SyntaxTableRow,
} from "./schemas.js";

const diagramMetaPattern = /^title="(?<title>[^"]+)"$/u;
const DiagramMeta = Schema.Struct({ title: DocsDiagramTitle });

const readLeaf = (node: SyntaxLeaf) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      inlineCode: ({ value }) => ({
        kind: "inline-code" as const,
        text: value,
      }),
      text: ({ value }) => ({ kind: "text" as const, text: value }),
    })
  );

const readFormatted = (node: SyntaxFormatted) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      emphasis: ({ children }) => ({
        content: Array.map(children, readLeaf),
        kind: "emphasis" as const,
      }),
      inlineCode: readLeaf,
      strong: ({ children }) => ({
        content: Array.map(children, readLeaf),
        kind: "strong" as const,
      }),
      text: readLeaf,
    })
  );

const readInline = (
  node: SyntaxPhrasing,
  links: DocsLinkContext
): Effect.Effect<DocsInline, DocsSourceError> =>
  node.type === "link"
    ? resolveDocsHref(node.url, links).pipe(
        Effect.map((href) => ({
          content: Array.map(node.children, readFormatted),
          href,
          kind: "link" as const,
        }))
      )
    : Effect.succeed(readFormatted(node));

const readInlines = (
  nodes: readonly SyntaxPhrasing[],
  links: DocsLinkContext
) => Effect.forEach(nodes, (node) => readInline(node, links));

const readRow = (row: SyntaxTableRow, links: DocsLinkContext) =>
  Effect.forEach(row.children, (cell) => readInlines(cell.children, links));

const readBlock = (
  node: SyntaxBlock,
  links: DocsLinkContext
): Effect.Effect<
  DocsBlock,
  DocsSourceError,
  DocsCodeHighlighter | DocsDiagramRenderer
> => {
  const fail = (message: string) =>
    new DocsSourceError({ message, operation: "parse", source: links.source });
  const unsupported = fail("The page uses unsupported Markdown.");
  return Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      code: ({ lang, meta, value }) =>
        Option.contains(lang, "mermaid")
          ? Effect.gen(function* () {
              const { title } = yield* Option.fromNullishOr(
                Option.isSome(meta)
                  ? diagramMetaPattern.exec(meta.value)?.groups
                  : undefined
              ).pipe(
                Effect.fromOption,
                Effect.flatMap(Schema.decodeUnknownEffect(DiagramMeta)),
                Effect.mapError(() =>
                  fail(
                    'A diagram needs a title, written as ```mermaid title="…"'
                  )
                )
              );
              const source = yield* DocsDiagramSource.makeEffect(value).pipe(
                Effect.mapError(() => unsupported)
              );
              const renderer = yield* DocsDiagramRenderer;
              const svg = yield* renderer
                .render(source)
                .pipe(
                  Effect.mapError(() => fail("A diagram could not be drawn."))
                );
              return { kind: "diagram" as const, source, svg, title };
            })
          : Effect.gen(function* () {
              if (Option.isSome(meta)) {
                return yield* unsupported;
              }
              const language = yield* Schema.decodeUnknownEffect(
                DocsCodeLanguage
              )(Option.getOrElse(lang, () => "txt")).pipe(
                Effect.mapError(() => unsupported)
              );
              const highlighter = yield* DocsCodeHighlighter;
              const lines = yield* highlighter
                .highlight({ language, text: value })
                .pipe(
                  Effect.mapError(() =>
                    fail("A code block could not be highlighted.")
                  )
                );
              return { kind: "code" as const, language, lines };
            }),
      heading: ({ children, depth }) =>
        depth === 1
          ? Effect.fail(fail("A page has only one # heading."))
          : Effect.gen(function* () {
              const id = yield* DocsHeadingId.makeEffect(
                plainText(children)
                  .toLowerCase()
                  .replaceAll(/[^a-z0-9]+/gu, "-")
                  .replaceAll(/^-|-$/gu, "")
              ).pipe(Effect.mapError(() => unsupported));
              return {
                content: yield* readInlines(children, links),
                depth,
                id,
                kind: "heading" as const,
              };
            }),
      list: ({ children, ordered, start }) =>
        Effect.forEach(children, ({ children: [paragraph] }) =>
          readInlines(paragraph.children, links)
        ).pipe(
          Effect.map((items) => ({
            items,
            kind: "list" as const,
            ordered,
            start: Option.getOrElse(start, () => 1),
          }))
        ),
      paragraph: ({ children }) =>
        readInlines(children, links).pipe(
          Effect.map((content) => ({ content, kind: "paragraph" as const }))
        ),
      table: ({ align, children: [header, ...rows] }) =>
        Effect.gen(function* () {
          return {
            align: Array.map(
              align,
              Option.getOrElse(() => "none" as const)
            ),
            header: yield* readRow(header, links),
            kind: "table" as const,
            rows: yield* Effect.forEach(rows, (row) => readRow(row, links)),
          };
        }),
    })
  );
};

// The page body after its `#` title, as Content's checked reading blocks.
// Links resolve against the catalogue; code and diagrams use Content's
// highlighter and renderer contracts.
export const readBody = Effect.fnUntraced(function* (
  blocks: readonly SyntaxBlock[],
  links: DocsLinkContext
) {
  const body = yield* Effect.forEach(blocks, (block) =>
    readBlock(block, links)
  );
  return yield* DocsReadingBody.makeEffect(body).pipe(
    Effect.mapError(
      () =>
        new DocsSourceError({
          message: "The page body is invalid, for example a repeated heading.",
          operation: "parse",
          source: links.source,
        })
    )
  );
});
