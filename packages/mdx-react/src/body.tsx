import type {
  ReadingBody,
  ReadingBlock,
  ReadingInline,
  ReadingLink,
} from "@taxkit/mdx/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Match,
  Option,
} from "effect";
import type { ComponentProps, ComponentType, ReactNode } from "react";

import { MdxCodeBlock } from "./code-block.js";
import type { MdxCodeBlockProps } from "./code-block.js";
import {
  ScrollArea,
  ScrollAreaViewport,
  ScrollBar,
} from "./scroll-area.view.js";

export type MdxLinkProps = Readonly<
  Pick<ReadingLink, "href"> & { children: ReactNode }
>;

const NativeLink = ({ href, children }: MdxLinkProps) => (
  <a href={href}>{children}</a>
);

const Inlines = ({
  content,
  Link,
}: Readonly<{
  content: readonly ReadingInline[];
  Link: ComponentType<MdxLinkProps>;
}>) =>
  EffectFunction.pipe(
    content,
    Array.map((inline, index) =>
      Match.value(inline).pipe(
        Match.discriminatorsExhaustive("kind")({
          emphasis: ({ content: nested }) => (
            <em key={index}>
              <Inlines content={nested} Link={Link} />
            </em>
          ),
          "inline-code": ({ text }) => <code key={index}>{text}</code>,
          link: ({ content: nested, href }) => (
            <Link href={href} key={index}>
              <Inlines content={nested} Link={Link} />
            </Link>
          ),
          strong: ({ content: nested }) => (
            <strong key={index}>
              <Inlines content={nested} Link={Link} />
            </strong>
          ),
          text: ({ text }) => text,
        })
      )
    )
  );

const Block = ({
  block,
  Link,
  Code,
  tableLabel,
}: Readonly<{
  block: ReadingBlock;
  Link: ComponentType<MdxLinkProps>;
  Code: ComponentType<Pick<MdxCodeBlockProps, "language" | "lines">>;
  tableLabel: string;
}>) =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ language, lines }) => <Code language={language} lines={lines} />,
      diagram: ({ svg, title }) => (
        <figure data-slot="diagram">
          <img
            alt={title}
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`}
          />
          <figcaption>{title}</figcaption>
        </figure>
      ),
      heading: ({ content, depth, id }) =>
        Match.value(depth).pipe(
          Match.when(1, () => (
            <h1 id={id}>
              <Inlines content={content} Link={Link} />
            </h1>
          )),
          Match.when(2, () => (
            <h2 id={id}>
              <Inlines content={content} Link={Link} />
            </h2>
          )),
          Match.when(3, () => (
            <h3 id={id}>
              <Inlines content={content} Link={Link} />
            </h3>
          )),
          Match.when(4, () => (
            <h4 id={id}>
              <Inlines content={content} Link={Link} />
            </h4>
          )),
          Match.exhaustive
        ),
      list: ({ items, ordered, start }) => {
        const children = EffectFunction.pipe(
          items,
          Array.map((item, index) => (
            <li key={index}>
              <Inlines content={item} Link={Link} />
            </li>
          ))
        );
        return EffectBoolean.match(ordered, {
          onFalse: () => <ul>{children}</ul>,
          onTrue: () => <ol start={start}>{children}</ol>,
        });
      },
      paragraph: ({ content }) => (
        <p>
          <Inlines content={content} Link={Link} />
        </p>
      ),
      table: ({ align, header, rows }) => {
        const textAlign = (column: number) =>
          Array.get(align, column).pipe(
            Option.filter((side) => side !== "none"),
            Option.getOrUndefined
          );
        return (
          <ScrollArea className="mdx-table-scroll">
            <ScrollAreaViewport
              aria-label={tableLabel}
              className="mdx-table-viewport"
              render={<section />}
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    {EffectFunction.pipe(
                      header,
                      Array.map((cell, column) => (
                        <th
                          key={column}
                          style={{ textAlign: textAlign(column) }}
                        >
                          <Inlines content={cell} Link={Link} />
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {EffectFunction.pipe(
                    rows,
                    Array.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {EffectFunction.pipe(
                          row,
                          Array.map((cell, column) => (
                            <td
                              key={column}
                              style={{ textAlign: textAlign(column) }}
                            >
                              <Inlines content={cell} Link={Link} />
                            </td>
                          ))
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </ScrollAreaViewport>
            <ScrollBar className="mdx-table-scrollbar" />
          </ScrollArea>
        );
      },
    })
  );

export const MdxBody = ({
  body,
  Link = NativeLink,
  Code = MdxCodeBlock,
  tableLabel = "Content table",
  ...props
}: Readonly<
  Omit<ComponentProps<"div">, "children"> & {
    body: ReadingBody;
    Link?: ComponentType<MdxLinkProps>;
    Code?: ComponentType<Pick<MdxCodeBlockProps, "language" | "lines">>;
    tableLabel?: string;
  }
>) => (
  <div {...props} data-mdx-body="">
    {EffectFunction.pipe(
      body,
      Array.map((block, index) => (
        <Block
          block={block}
          Code={Code}
          key={index}
          Link={Link}
          tableLabel={tableLabel}
        />
      ))
    )}
  </div>
);
