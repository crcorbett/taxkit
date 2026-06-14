import { Picture, Pre } from "@whattax/docs-fumadocs/render";
import { Option } from "effect";
import type { ComponentPropsWithoutRef } from "react";

const normalizeHref = (href: string | undefined) =>
  Option.fromUndefinedOr(href).pipe(
    Option.map((value) => value.replace(/\.mdx(?:#.*)?$/u, "")),
    Option.getOrUndefined
  );

export const mdxComponents = {
  a: ({ children, href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a href={normalizeHref(href)} {...props}>
      {children}
    </a>
  ),
  img: Picture,
  pre: Pre,
};
