import { DocsSourceError } from "@taxkit/content/errors";
import { DocsPageFrontmatter } from "@taxkit/content/schemas";
import type { DocsSource } from "@taxkit/content/schemas";
import { Effect, Option, Schema } from "effect";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmTableFromMarkdown } from "mdast-util-gfm-table";
import { mdxFromMarkdown } from "mdast-util-mdx";
import { gfmTable } from "micromark-extension-gfm-table";
import { mdxjs } from "micromark-extension-mdxjs";
import * as YAML from "yaml";

import { SyntaxRoot } from "./schemas.js";

const frontmatterPattern = /^---\n(?<yaml>[\s\S]*?)\n---\n(?<body>[\s\S]*)$/u;
const FileParts = Schema.Struct({ body: Schema.String, yaml: Schema.String });

// One authored file as checked frontmatter and a checked syntax tree. The
// YAML and MDX parser calls stay here; their output is decoded at once.
export const readMdx = Effect.fnUntraced(function* (source: DocsSource) {
  const fail = (message: string) =>
    new DocsSourceError({ message, operation: "parse", source: source.path });
  const invalidFrontmatter = fail(
    "The page frontmatter is missing or invalid."
  );
  const unsupported = fail("The page uses unsupported Markdown.");
  const parts = yield* Option.fromNullishOr(
    frontmatterPattern.exec(source.text)?.groups
  ).pipe(
    Effect.fromOption,
    Effect.flatMap(Schema.decodeUnknownEffect(FileParts)),
    Effect.mapError(() => invalidFrontmatter)
  );
  const yaml: unknown = yield* Effect.try({
    catch: () => invalidFrontmatter,
    try: () => {
      const value: unknown = YAML.parse(parts.yaml, {
        maxAliasCount: 0,
        uniqueKeys: true,
      });
      return value;
    },
  });
  const frontmatter = yield* Schema.decodeUnknownEffect(DocsPageFrontmatter)(
    yaml,
    { onExcessProperty: "error" }
  ).pipe(Effect.mapError(() => invalidFrontmatter));
  const tree: unknown = yield* Effect.try({
    catch: () => unsupported,
    try: () =>
      fromMarkdown(parts.body, {
        extensions: [mdxjs(), gfmTable()],
        mdastExtensions: [mdxFromMarkdown(), gfmTableFromMarkdown()],
      }),
  });
  const root = yield* Schema.decodeUnknownEffect(SyntaxRoot)(tree).pipe(
    Effect.mapError(() => unsupported)
  );
  return { frontmatter, root };
});
