import { ScrollArea } from "@base-ui/react/scroll-area";
import type { DocsCodeToken, DocsBlock } from "@taxkit/content/schemas";
import {
  Array,
  Boolean as EffectBoolean,
  Function as EffectFunction,
  Match,
} from "effect";
import { Code2, Terminal } from "lucide-react";
import { useId } from "react";

import { DocsCopyButton } from "./copy-button.container";

const tokenStyle = (token: DocsCodeToken) => ({
  color: `light-dark(${token.light.color},${token.dark.color})`,
  "--mdx-light-font-style": EffectBoolean.match(
    token.light.style.endsWith("italic"),
    { onFalse: () => "normal", onTrue: () => "italic" }
  ),
  "--mdx-dark-font-style": EffectBoolean.match(
    token.dark.style.endsWith("italic"),
    { onFalse: () => "normal", onTrue: () => "italic" }
  ),
  "--mdx-light-font-weight": EffectBoolean.match(
    token.light.style.startsWith("bold"),
    { onFalse: () => 400, onTrue: () => 600 }
  ),
  "--mdx-dark-font-weight": EffectBoolean.match(
    token.dark.style.startsWith("bold"),
    { onFalse: () => 400, onTrue: () => 600 }
  ),
});

export const DocsCodeBlock = ({
  language,
  lines,
}: Readonly<
  Pick<Extract<DocsBlock, { kind: "code" }>, "language" | "lines">
>) => {
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
    <figure className="docs-code-block" data-slot="code-block">
      <figcaption>
        <span className="docs-code-language" id={caption}>
          <Icon aria-hidden="true" size={16} />
          {presentation.label}
        </span>
        <DocsCopyButton label={`Copy ${presentation.label} code`} text={text} />
      </figcaption>
      <ScrollArea.Root className="docs-code-scroll">
        <ScrollArea.Viewport
          aria-labelledby={caption}
          className="docs-code-viewport"
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
                          className="docs-code-token"
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
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="docs-code-scrollbar"
          orientation="horizontal"
        >
          <ScrollArea.Thumb className="docs-code-scroll-thumb" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <noscript>
        <style>
          {
            ".docs-code-viewport{scrollbar-width:auto!important}.docs-code-viewport::-webkit-scrollbar{display:block!important}.docs-code-scrollbar{display:none!important}"
          }
        </style>
      </noscript>
    </figure>
  );
};
