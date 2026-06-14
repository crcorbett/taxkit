import { Option } from "effect";
import { createElement } from "react";
import type { ComponentProps, ReactNode } from "react";

export type CodeBlockProps = ComponentProps<"figure">;
export type CodeBlockHeaderProps = ComponentProps<"figcaption">;
export type CodeBlockBodyProps = ComponentProps<"div">;

export type PreProps = ComponentProps<"pre"> & {
  readonly "data-language"?: string | undefined;
  readonly "data-title"?: string | undefined;
};

export type PictureProps = ComponentProps<"img"> & {
  readonly caption?: ReactNode | undefined;
};

export const CodeBlock = ({ children, ...props }: CodeBlockProps) =>
  createElement("figure", { ...props, "data-slot": "code-block" }, children);

export const CodeBlockHeader = ({ children, ...props }: CodeBlockHeaderProps) =>
  createElement(
    "figcaption",
    { ...props, "data-slot": "code-block-header" },
    children
  );

export const CodeBlockBody = ({ children, ...props }: CodeBlockBodyProps) =>
  createElement("div", { ...props, "data-slot": "code-block-body" }, children);

export const Pre = ({ children, ...props }: PreProps) => {
  const title = props["data-title"];
  const language = props["data-language"];
  const label = Option.fromUndefinedOr(title).pipe(
    Option.orElse(() => Option.fromUndefinedOr(language))
  );

  return createElement(
    CodeBlock,
    null,
    label.pipe(
      Option.match({
        onNone: () => null,
        onSome: (value) => createElement(CodeBlockHeader, null, value),
      })
    ),
    createElement(CodeBlockBody, null, createElement("pre", props, children))
  );
};

export const Picture = ({ caption, ...props }: PictureProps) =>
  createElement(
    "figure",
    { "data-slot": "picture" },
    createElement("img", props),
    Option.fromUndefinedOr(caption).pipe(
      Option.match({
        onNone: () => null,
        onSome: (value) => createElement("figcaption", null, value),
      })
    )
  );
