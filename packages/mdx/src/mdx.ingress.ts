import {
  Function as EffectFunction,
  Boolean,
  Effect,
  Option,
  Schema,
} from "effect";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { gfmTable } from "micromark-extension-gfm-table";
import { mdxjs } from "micromark-extension-mdxjs";
import * as YAML from "yaml";

import { CompileError } from "./errors.js";
import { Metadata } from "./schemas.js";
import type { Source } from "./schemas.js";
import { SyntaxRoot } from "./syntax.schemas.js";

const frontmatterPattern =
  /^---\r?\n(?<yaml>[\s\S]*?)\r?\n---(?:\r?\n|$)(?<body>[\s\S]*)$/u;
const FileParts = Schema.Struct({ body: Schema.String, yaml: Schema.String });
export const parseSource = Effect.fnUntraced(function* (source: Source) {
  const fail = (reason: "syntax" | "frontmatter") =>
    new CompileError({
      message: "The source syntax or metadata is invalid.",
      reason,
      source: source.id,
    });
  const parts = yield* Option.match(
    Option.fromNullishOr(frontmatterPattern.exec(source.text)?.groups),
    {
      onNone: () =>
        Boolean.match(
          source.text.startsWith("---\n") || source.text.startsWith("---\r\n"),
          {
            onFalse: () =>
              Effect.succeed({
                body: source.text,
                metadata: Option.none<typeof Metadata.Type>(),
              }),
            onTrue: () => Effect.fail(fail("frontmatter")),
          }
        ),
      onSome: (groups) =>
        Effect.gen(function* () {
          const fileParts = yield* Schema.decodeUnknownEffect(FileParts)(
            groups
          ).pipe(Effect.mapError(() => fail("frontmatter")));
          const value: unknown = yield* Effect.try({
            catch: () => fail("frontmatter"),
            try: () => {
              const doc = YAML.parseDocument(fileParts.yaml, {
                uniqueKeys: true,
              });
              if (doc.errors.length !== 0 || doc.warnings.length !== 0) {
                return null;
              }
              const result: unknown = doc.toJS({ maxAliasCount: 0 });
              return result;
            },
          });
          const metadata = yield* Schema.decodeUnknownEffect(Metadata)(
            value
          ).pipe(Effect.mapError(() => fail("frontmatter")));
          return { body: fileParts.body, metadata: Option.some(metadata) };
        }),
    }
  );
  const tree: unknown = yield* Effect.try({
    catch: () => fail("syntax"),
    try: () =>
      EffectFunction.pipe(parts.body.replaceAll("\r\n", "\n"), (markdown) =>
        fromMarkdown(markdown, {
          extensions: [mdxjs(), gfmTable()],
          mdastExtensions: [mdxFromMarkdown(), gfmTableFromMarkdown()],
        })
      ),
  });
  const root = yield* Schema.decodeUnknownEffect(SyntaxRoot)(tree).pipe(
    Effect.mapError(() => fail("syntax"))
  );
  return { metadata: parts.metadata, root };
});
