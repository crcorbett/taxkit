import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/*
 * Surface — corner-dither primitive (DESIGN.md §6.2, §13.2).
 *
 * Wraps any block in a positioned container with a Bayer-4 dither bleeding
 * inward from one corner (or both, for diagonal). The dither texture is
 * theme-aware via currentColor and fades through a radial mask. Use for
 * cards, callouts, panels, dialogs, and hero blocks. Default corner is
 * top-right; pass corner="diagonal" for panels/dialogs (top-right and
 * bottom-left for diagonal tension).
 */
const surfaceVariants = cva("surface-dithered", {
  defaultVariants: {
    corner: "tr",
  },
  variants: {
    corner: {
      bl: "dither-bl",
      br: "dither-br",
      diagonal: "dither-diagonal",
      none: "",
      tl: "dither-tl",
      tr: "dither-tr",
    },
  },
});

function Surface({
  className,
  corner = "tr",
  render,
  ...props
}: useRender.ComponentProps<"div"> & VariantProps<typeof surfaceVariants>) {
  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      { className: cn(surfaceVariants({ corner }), className) },
      props
    ),
    render,
    state: { corner, slot: "surface" },
  });
}

export { Surface, surfaceVariants };
