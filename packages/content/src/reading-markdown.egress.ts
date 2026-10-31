import type { RenderedBlock, RenderedInline } from "@taxkit/mdx/schemas";
import {
  Function as EffectFunction,
  Array,
  Boolean as EffectBoolean,
  Match,
  Order,
} from "effect";

import type { DocsNonEmptyText } from "./schemas.js";
// Text must stay literal when read as Markdown: protect inline delimiters,
// table pipes, entities and block markers at line starts. Real formatting,
// list markers, code and link addresses have their own serialisers.
const escapeText = (text: string) =>
  text
    .replaceAll(/[\\`*{}[\]()#<>&_|]/gu, "\\$&")
    .replaceAll(
      /(?<line>^|\n)(?<indent> {0,3})(?<marker>[-+=])/gu,
      "$<line>$<indent>\\$<marker>"
    )
    .replaceAll(
      /(?<line>^|\n)(?<number> {0,3}\d{1,9})\.(?=[ \t])/gu,
      "$<line>$<number>\\."
    );
// A code fence one backtick longer than any run inside the text.
const fence = (text: string, minimum: number) =>
  EffectFunction.pipe(
    text.split(/[^`]+/u),
    Array.map((run) => run.length + 1),
    Array.prepend(minimum),
    Array.max(Order.Number),
    (length) => "`".repeat(length)
  );
const inlineMarkdown = (inline: RenderedInline): string =>
  Match.value(inline).pipe(
    Match.discriminatorsExhaustive("kind")({
      emphasis: ({ content }) =>
        `*${EffectFunction.pipe(content, Array.map(inlineMarkdown)).join("")}*`,
      "inline-code": ({ text }) =>
        `${fence(text, 1)} ${text} ${fence(text, 1)}`,
      link: ({ content, href }) =>
        `[${EffectFunction.pipe(content, Array.map(inlineMarkdown)).join("")}](<${href}>)`,
      strong: ({ content }) =>
        `**${EffectFunction.pipe(content, Array.map(inlineMarkdown)).join("")}**`,
      text: ({ text }) => escapeText(text),
    })
  );
const inlines = (content: readonly RenderedInline[]): string =>
  EffectFunction.pipe(content, Array.map(inlineMarkdown)).join("");
const tableRow = (cells: readonly (readonly RenderedInline[])[]) =>
  `| ${EffectFunction.pipe(cells, Array.map(inlines)).join(" | ")} |`;
const blockMarkdown = (block: RenderedBlock): string =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ language, text }) =>
        `${fence(text, 3)}${language}\n${text}\n${fence(text, 3)}`,
      diagram: ({ source }) =>
        `${fence(source, 3)}mermaid\n${source}\n${fence(source, 3)}`,
      heading: ({ content, depth }) =>
        `${"#".repeat(depth)} ${inlines(content)}`,
      list: ({ items, ordered, start }) =>
        EffectFunction.pipe(
          items,
          Array.map((item, index) =>
            EffectBoolean.match(ordered, {
              onTrue: () => `${start + index}. ${inlines(item)}`,
              onFalse: () => `- ${inlines(item)}`,
            })
          )
        ).join("\n"),
      paragraph: ({ content }) => inlines(content),
      table: ({ align, header, rows }) =>
        [
          tableRow(header),
          `| ${EffectFunction.pipe(
            align,
            Array.map((side) =>
              Match.value(side).pipe(
                Match.when("left", () => ":---"),
                Match.when("center", () => ":---:"),
                Match.when("right", () => "---:"),
                Match.when("none", () => "---"),
                Match.exhaustive
              )
            )
          ).join(" | ")} |`,
          ...EffectFunction.pipe(rows, Array.map(tableRow)),
        ].join("\n"),
    })
  );
// The processed Markdown served at a page's `.md` address and used by search:
// the checked body with resolved links, written back as plain Markdown.
export const readingMarkdown = ({
  body,
  title,
}: Readonly<{
  body: readonly RenderedBlock[];
  title: DocsNonEmptyText;
}>): string =>
  `# ${escapeText(title)}\n\n${EffectFunction.pipe(body, Array.map(blockMarkdown)).join("\n\n")}\n`;
