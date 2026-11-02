import type { CodeToken, ReadingCodeBlock } from "@taxkit/mdx/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Match,
} from "effect";
import { Code2, Terminal } from "lucide-react";
import { useId } from "react";
import type { ComponentProps, ReactNode } from "react";

import {
  ScrollArea,
  ScrollAreaViewport,
  ScrollBar,
} from "./scroll-area.view.js";

const formatFontStyle = Match.type<CodeToken["light"]["style"]>().pipe(
  Match.when("normal", () => ({ style: "normal", weight: 400 })),
  Match.when("italic", () => ({ style: "italic", weight: 400 })),
  Match.when("bold", () => ({ style: "normal", weight: 600 })),
  Match.when("bold-italic", () => ({ style: "italic", weight: 600 })),
  Match.exhaustive
);

const tokenStyle = (token: CodeToken) => {
  const light = formatFontStyle(token.light.style);
  const dark = formatFontStyle(token.dark.style);
  return {
    color: `light-dark(${token.light.color},${token.dark.color})`,
    "--mdx-light-font-style": light.style,
    "--mdx-dark-font-style": dark.style,
    "--mdx-light-font-weight": light.weight,
    "--mdx-dark-font-weight": dark.weight,
  };
};

export type MdxCodeToolbarProps = Readonly<{ label: string; text: string }>;

export type MdxCodeBlockProps = Readonly<
  Pick<ReadingCodeBlock, "language" | "lines"> &
    Omit<ComponentProps<"figure">, "children"> & {
      renderToolbar?: (code: MdxCodeToolbarProps) => ReactNode;
    }
>;

export const MdxCodeBlock = ({
  language,
  lines,
  renderToolbar,
  ...props
}: MdxCodeBlockProps) => {
  const caption = useId();
  const text = EffectFunction.pipe(
    lines,
    Array.map((line) =>
      EffectFunction.pipe(
        line,
        Array.map((token) => token.text),
        Array.join("")
      )
    ),
    Array.join("\n")
  );
  const presentation = Match.value(language).pipe(
    Match.when("ts", () => ({ label: "TypeScript", icon: Code2 })),
    Match.when("json", () => ({ label: "JSON", icon: Code2 })),
    Match.when("sh", () => ({ label: "Terminal", icon: Terminal })),
    Match.when("md", () => ({ label: "Markdown", icon: Code2 })),
    Match.when("txt", () => ({ label: "Plain text", icon: Code2 })),
    Match.exhaustive
  );
  const Icon = presentation.icon;
  return (
    <figure {...props} data-mdx-code-block="" data-slot="code-block">
      <figcaption>
        <span className="mdx-code-language" id={caption}>
          <Icon aria-hidden="true" size={16} />
          {presentation.label}
        </span>
        {renderToolbar?.({ label: presentation.label, text })}
      </figcaption>
      <ScrollArea>
        <ScrollAreaViewport
          aria-labelledby={caption}
          className="mdx-code-viewport"
          render={<section />}
          tabIndex={0}
        >
          <pre data-language={language}>
            <code>
              {EffectFunction.pipe(
                lines,
                Array.map((line, lineIndex) => (
                  <span className="line" key={lineIndex}>
                    {EffectFunction.pipe(
                      line,
                      Array.map((token, tokenIndex) => (
                        <span
                          className="mdx-code-token"
                          key={tokenIndex}
                          style={tokenStyle(token)}
                        >
                          {token.text}
                        </span>
                      ))
                    )}
                    {EffectBoolean.match(lineIndex < lines.length - 1, {
                      onFalse: () => null,
                      onTrue: (): "\n" => "\n",
                    })}
                  </span>
                ))
              )}
            </code>
          </pre>
        </ScrollAreaViewport>
        <ScrollBar className="mdx-code-scrollbar" />
      </ScrollArea>
    </figure>
  );
};
