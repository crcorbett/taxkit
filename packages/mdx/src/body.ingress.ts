import {
  Function as EffectFunction,
  Boolean,
  Array,
  Effect,
  Match,
  Option,
  Schema,
} from "effect";

import { CompileError } from "./errors.js";
import {
  CodeLanguage,
  CodeText,
  ListStart,
  DiagramSource,
  DiagramTitle,
  HeadingId,
  Blocks,
} from "./schemas.js";
import type { Block, Inline, SourceId } from "./schemas.js";
import { plainText } from "./syntax.schemas.js";
import type {
  BlockCompilation,
  SyntaxBlock,
  SyntaxFormatted,
  SyntaxLeaf,
  SyntaxPhrasing,
  SyntaxTableRow,
} from "./syntax.schemas.js";

const diagramMetaPattern = /^title="(?<title>[^"]+)"$/u;
const DiagramMeta = Schema.Struct({ title: DiagramTitle });
const compileLeaf = (node: SyntaxLeaf) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      inlineCode: ({ value }) => ({
        kind: "inline-code" as const,
        text: value,
      }),
      text: ({ value }) => ({ kind: "text" as const, text: value }),
    })
  );
const compileFormatted = (node: SyntaxFormatted) =>
  Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      emphasis: ({ children }) => ({
        content: EffectFunction.pipe(children, Array.map(compileLeaf)),
        kind: "emphasis" as const,
      }),
      inlineCode: compileLeaf,
      strong: ({ children }) => ({
        content: EffectFunction.pipe(children, Array.map(compileLeaf)),
        kind: "strong" as const,
      }),
      text: compileLeaf,
    })
  );
const compileInline = (node: SyntaxPhrasing): Effect.Effect<Inline> =>
  Match.value(node).pipe(
    Match.when({ type: "link" }, (link) => ({
      content: EffectFunction.pipe(link.children, Array.map(compileFormatted)),
      kind: "link" as const,
      target: link.url,
    })),
    Match.orElse(compileFormatted),
    Effect.succeed
  );
const compileInlines = (nodes: readonly SyntaxPhrasing[]) =>
  EffectFunction.pipe(
    nodes,
    Effect.forEach((node) => compileInline(node))
  );
const compileRow = (row: SyntaxTableRow) =>
  EffectFunction.pipe(
    row.children,
    Effect.forEach((cell) => compileInlines(cell.children))
  );
const compileBlock = (
  node: SyntaxBlock,
  sourceId: SourceId
): Effect.Effect<Block, CompileError> => {
  const fail = (reason: CompileError["reason"], message: string) =>
    new CompileError({ message, reason, source: sourceId });
  return Match.value(node).pipe(
    Match.discriminatorsExhaustive("type")({
      code: ({ lang, meta, value }) =>
        Boolean.match(Option.contains(lang, "mermaid"), {
          onFalse: () =>
            Effect.gen(function* () {
              if (Option.isSome(meta)) {
                return yield* fail(
                  "code-metadata",
                  "Code block metadata is not supported."
                );
              }
              const language = yield* Schema.decodeUnknownEffect(CodeLanguage)(
                EffectFunction.pipe(
                  lang,
                  Option.getOrElse(() => "txt")
                )
              ).pipe(
                Effect.mapError(() =>
                  fail(
                    "code-language",
                    "The code block language is not supported."
                  )
                )
              );
              const text = yield* CodeText.makeEffect(value).pipe(
                Effect.mapError(() =>
                  fail("body", "The code text exceeds the supported size.")
                )
              );
              return { kind: "code" as const, language, text };
            }),
          onTrue: () =>
            Effect.gen(function* () {
              const { title } = yield* meta.pipe(
                Option.flatMap((text) =>
                  Option.fromNullishOr(diagramMetaPattern.exec(text)?.groups)
                ),
                Effect.fromOption,
                Effect.flatMap(Schema.decodeUnknownEffect(DiagramMeta)),
                Effect.mapError(() =>
                  fail(
                    "diagram-title",
                    'A diagram needs a title, written as ```mermaid title="…"'
                  )
                )
              );
              const source = yield* DiagramSource.makeEffect(value).pipe(
                Effect.mapError(() =>
                  fail("diagram-source", "The diagram source is invalid.")
                )
              );
              return { kind: "diagram" as const, source, title };
            }),
        }),
      heading: ({ children, depth }) =>
        Effect.gen(function* () {
          const id = yield* HeadingId.makeEffect(
            plainText(children)
              .toLowerCase()
              .replaceAll(/[^a-z0-9]+/gu, "-")
              .replaceAll(/^-|-$/gu, "")
          ).pipe(
            Effect.mapError(() =>
              fail("heading", "The heading cannot form a page anchor.")
            )
          );
          return {
            content: yield* compileInlines(children),
            depth,
            id,
            kind: "heading" as const,
          };
        }),
      list: ({ children, ordered, start }) =>
        EffectFunction.pipe(
          children,
          Effect.forEach(({ children: [paragraph] }) =>
            compileInlines(paragraph.children)
          ),
          Effect.flatMap((items) =>
            Option.match(start, {
              onNone: () => ListStart.makeEffect(1),
              onSome: Effect.succeed,
            }).pipe(
              Effect.map((position) => ({
                items,
                kind: "list" as const,
                ordered,
                start: position,
              })),
              Effect.mapError(() => fail("body", "The list start is invalid."))
            )
          )
        ),
      paragraph: ({ children }) =>
        compileInlines(children).pipe(
          Effect.map((content) => ({ content, kind: "paragraph" as const }))
        ),
      table: ({ align, children: [header, ...rows] }) =>
        Effect.gen(function* () {
          return {
            align: EffectFunction.pipe(
              align,
              Array.map(Option.getOrElse(() => "none" as const))
            ),
            header: yield* compileRow(header),
            kind: "table" as const,
            rows: yield* EffectFunction.pipe(
              rows,
              Effect.forEach((row) => compileRow(row))
            ),
          };
        }),
    })
  );
};
// Compile checked syntax without resolving links or acquiring providers.
export const compileBlocks = Effect.fnUntraced(function* ({
  blocks,
  sourceId,
}: BlockCompilation) {
  const body = yield* EffectFunction.pipe(
    blocks,
    Effect.forEach((block) => compileBlock(block, sourceId))
  );
  return yield* Blocks.makeEffect(body).pipe(
    Effect.mapError(
      () =>
        new CompileError({
          message: "The page body is invalid, for example a repeated heading.",
          reason: "body",
          source: sourceId,
        })
    )
  );
});
