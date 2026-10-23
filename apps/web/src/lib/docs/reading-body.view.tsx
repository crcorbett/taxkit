import { Link } from "@tanstack/react-router";
import type {
  DocsBlock,
  DocsCodeToken,
  DocsInline,
  DocsReadingBody,
} from "@taxkit/content/schemas";
import { Array, Match, Option, Record } from "effect";

import { requestDocsNavigationFocus } from "./components";

const pageLinkPattern = /^(?<path>\/[^#]*)(?:#(?<hash>.+))?$/u;

// Content resolved every link: a public page path, a same-page fragment or an
// HTTPS address. Only page paths go through the router.
const InlineLink = ({
  children,
  href,
}: Readonly<{ children: React.ReactNode; href: string }>) =>
  Option.fromNullishOr(pageLinkPattern.exec(href)?.groups).pipe(
    Option.match({
      onNone: () => <a href={href}>{children}</a>,
      onSome: (page) => (
        <Link
          {...Option.match(
            Record.get(page, "hash").pipe(Option.flatMap(Option.fromNullishOr)),
            {
              onNone: () => ({}),
              onSome: (hash) => ({ hash }),
            }
          )}
          onClick={requestDocsNavigationFocus}
          params={{
            _splat: Record.get(page, "path").pipe(
              Option.flatMap(Option.fromNullishOr),
              Option.map((path) => path.slice(1)),
              Option.getOrElse(() => "")
            ),
          }}
          to="/$"
        >
          {children}
        </Link>
      ),
    })
  );

const Inlines = ({ content }: Readonly<{ content: readonly DocsInline[] }>) =>
  Array.map(content, (inline, index) =>
    Match.value(inline).pipe(
      Match.discriminatorsExhaustive("kind")({
        emphasis: ({ content: leaves }) => (
          <em key={index}>
            <Inlines content={leaves} />
          </em>
        ),
        "inline-code": ({ text }) => <code key={index}>{text}</code>,
        link: ({ content: formatted, href }) => (
          <InlineLink href={href} key={index}>
            <Inlines content={formatted} />
          </InlineLink>
        ),
        strong: ({ content: leaves }) => (
          <strong key={index}>
            <Inlines content={leaves} />
          </strong>
        ),
        text: ({ text }) => text,
      })
    )
  );

const tokenStyle = (token: DocsCodeToken) => ({
  color: Option.getOrUndefined(token.color),
  fontStyle: token.style.endsWith("italic") ? "italic" : undefined,
  fontWeight: token.style.startsWith("bold") ? 600 : undefined,
});

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- A labelled horizontal scroll region needs explicit keyboard focus across supported browsers. */
const Block = ({ block }: Readonly<{ block: DocsBlock }>) =>
  Match.value(block).pipe(
    Match.discriminatorsExhaustive("kind")({
      code: ({ language, lines }) => (
        <figure data-slot="code-block">
          <figcaption>{language}</figcaption>
          <pre data-language={language}>
            <code>
              {Array.map(lines, (line, lineIndex) => (
                <span className="line" key={lineIndex}>
                  {Array.map(line, (token, tokenIndex) => (
                    <span key={tokenIndex} style={tokenStyle(token)}>
                      {token.text}
                    </span>
                  ))}
                  {lineIndex < lines.length - 1 ? "\n" : null}
                </span>
              ))}
            </code>
          </pre>
        </figure>
      ),
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
          Match.when(2, () => (
            <h2 id={id}>
              <Inlines content={content} />
            </h2>
          )),
          Match.when(3, () => (
            <h3 id={id}>
              <Inlines content={content} />
            </h3>
          )),
          Match.when(4, () => (
            <h4 id={id}>
              <Inlines content={content} />
            </h4>
          )),
          Match.exhaustive
        ),
      list: ({ items, ordered, start }) => {
        const children = Array.map(items, (item, index) => (
          <li key={index}>
            <Inlines content={item} />
          </li>
        ));
        return ordered ? (
          <ol start={start}>{children}</ol>
        ) : (
          <ul>{children}</ul>
        );
      },
      paragraph: ({ content }) => (
        <p>
          <Inlines content={content} />
        </p>
      ),
      table: ({ align, header, rows }) => {
        const textAlign = (column: number) =>
          Array.get(align, column).pipe(
            Option.filter((side) => side !== "none"),
            Option.getOrUndefined
          );
        return (
          <section
            aria-label="Documentation table"
            className="docs-table-scroll"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {Array.map(header, (cell, column) => (
                    <th key={column} style={{ textAlign: textAlign(column) }}>
                      <Inlines content={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.map(rows, (row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.map(row, (cell, column) => (
                      <td key={column} style={{ textAlign: textAlign(column) }}>
                        <Inlines content={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      },
    })
  );
/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */

// The checked page body from Content. Blocks keep their authored order.
export const DocsReadingBodyView = ({
  body,
}: Readonly<{ body: DocsReadingBody }>) =>
  Array.map(body, (block, index) => <Block block={block} key={index} />);
