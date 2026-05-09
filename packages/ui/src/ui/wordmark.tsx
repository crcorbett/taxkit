import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Wordmark — site identity treatment (DESIGN.md §9).
 *
 * "WhatTax" set in Geist Mono, weight 500, +0.04em tracking.
 * size="header" is text-md (1.125rem); size="footer" is text-sm (0.875rem).
 * Color resolves to --foreground, which is ink in light mode and vellum in
 * dark mode (the inversion is built into the semantic token, not the
 * component). Pass `render` to wrap in an <a> for the homepage link.
 */
const wordmarkVariants = cva(
  "font-mono font-medium lowercase tracking-loose text-foreground",
  {
    defaultVariants: {
      size: "header",
    },
    variants: {
      size: {
        footer: "text-sm",
        header: "text-md",
      },
    },
  }
);

const DEFAULT_WORDMARK = "WhatTax";

function Wordmark({
  className,
  size = "header",
  children = DEFAULT_WORDMARK,
  render,
  ...props
}: useRender.ComponentProps<"span"> &
  VariantProps<typeof wordmarkVariants> & {
    children?: string;
  }) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        children,
        className: cn(wordmarkVariants({ size }), className),
      },
      props
    ),
    render,
    state: { size, slot: "wordmark" },
  });
}

export { Wordmark, wordmarkVariants };
