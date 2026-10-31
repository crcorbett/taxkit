import type { RenderedBlock, RenderedInline } from "@taxkit/mdx/schemas";
import { Array, Match, Order, pipe } from "effect";

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
  "`".repeat(
    pipe(
      text.split(/[^`]+/u),
      Array.map((run) => run.length + 1),
      Array.prepend(minimum),
      Array.max(Order.Number)
    )
  );

const inlineMarkdown = (inline: RenderedInline): string =>
  Match.value(inline).pipe(
    Match.discriminatorsExhaustive("kind")({
      emphasis: ({ content }) =>
        `*${Array.map(content, inlineMarkdown).join("")}*`,
      "inline-code": ({ text }) =>
        `${fence(text, 1)} ${text} ${fence(text, 1)}`,
      link: ({ content, href }) =>
        `[${Array.map(content, inlineMarkdown).join("")}](<${href}>)`,
      strong: ({ content }) =>
        `**${Array.map(content, inlineMarkdown).join("")}**`,
      text: ({ text }) => escapeText(text),
    })
  );

const inlines = (content: readonly RenderedInline[]): string =>
  Array.map(content, inlineMarkdown).join("");

const tableRow = (cells: readonly (readonly RenderedInline[])[]) =>
  `| ${Array.map(cells, inlines).join(" | ")} |`;

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
        Array.map(items, (item, index) =>
          ordered ? `${start + index}. ${inlines(item)}` : `- ${inlines(item)}`
        ).join("\n"),
      paragraph: ({ content }) => inlines(content),
      table: ({ align, header, rows }) =>
        [
          tableRow(header),
          `| ${Array.map(align, (side) =>
            Match.value(side).pipe(
              Match.when("left", () => ":---"),
              Match.when("center", () => ":---:"),
              Match.when("right", () => "---:"),
              Match.when("none", () => "---"),
              Match.exhaustive
            )
          ).join(" | ")} |`,
          ...Array.map(rows, tableRow),
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
  `# ${escapeText(title)}\n\n${Array.map(body, blockMarkdown).join("\n\n")}\n`;
