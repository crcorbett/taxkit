import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

export const ScrollArea = (props: Readonly<ScrollAreaPrimitive.Root.Props>) => (
  <>
    <ScrollAreaPrimitive.Root
      data-mdx-scroll-area=""
      data-slot="scroll-area"
      {...props}
    />
    <noscript>
      <style>
        {
          "[data-mdx-scroll-area] [data-slot=scroll-area-viewport]{scrollbar-width:auto!important}[data-mdx-scroll-area] [data-slot=scroll-area-viewport]::-webkit-scrollbar{display:block!important}[data-mdx-scroll-area] [data-slot=scroll-area-scrollbar]{display:none!important}"
        }
      </style>
    </noscript>
  </>
);

export const ScrollAreaViewport = (
  props: Readonly<ScrollAreaPrimitive.Viewport.Props>
) => (
  <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" {...props} />
);

export const ScrollBar = (
  props: Readonly<
    Omit<ScrollAreaPrimitive.Scrollbar.Props, "children" | "orientation">
  >
) => (
  <ScrollAreaPrimitive.Scrollbar
    data-slot="scroll-area-scrollbar"
    data-orientation="horizontal"
    orientation="horizontal"
    {...props}
  >
    <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" />
  </ScrollAreaPrimitive.Scrollbar>
);
