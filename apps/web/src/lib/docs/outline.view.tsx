import type {
  DocsInline,
  DocsReadingBody,
  DocsHeadingId,
} from "@taxkit/content/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Match,
  Option,
} from "effect";
import { ChevronDown, List } from "lucide-react";
import type { ReactNode } from "react";

const formatInlineText = (content: readonly DocsInline[]): string =>
  EffectFunction.pipe(
    content,
    Array.map((inline) =>
      Match.value(inline).pipe(
        Match.discriminatorsExhaustive("kind")({
          text: ({ text }) => text,
          "inline-code": ({ text }) => text,
          emphasis: ({ content: nested }) => formatInlineText(nested),
          strong: ({ content: nested }) => formatInlineText(nested),
          link: ({ content: nested }) => formatInlineText(nested),
        })
      )
    ),
    Array.join("")
  );

export const DocsOutlineView = ({
  body,
  active,
}: Readonly<{
  body: DocsReadingBody;
  active: Option.Option<DocsHeadingId>;
}>) => (
  <nav aria-label="On this page" className="docs-outline">
    <ol>
      {EffectFunction.pipe(
        body,
        Array.filter((block) => block.kind === "heading"),
        Array.map(({ content, depth, id }) => (
          <li data-depth={depth} key={id}>
            <a
              aria-current={EffectBoolean.match(Option.contains(active, id), {
                onTrue: (): "location" => "location",
                onFalse: EffectFunction.constUndefined,
              })}
              href={`#${id}`}
            >
              {formatInlineText(content)}
            </a>
          </li>
        ))
      )}
    </ol>
  </nav>
);

export const DocsMobileOutline = ({
  children,
}: Readonly<{ children: ReactNode }>) => (
  <details className="docs-mobile-outline">
    <summary>
      <List aria-hidden="true" size={16} /> On this page{" "}
      <ChevronDown aria-hidden="true" size={16} />
    </summary>
    {children}
  </details>
);
