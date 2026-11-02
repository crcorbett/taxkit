import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";

export const ScrollArea = (props: Readonly<ScrollAreaPrimitive.Root.Props>) => (
  <ScrollAreaPrimitive.Root data-slot="scroll-area" {...props} />
);

export const ScrollAreaViewport = (
  props: Readonly<ScrollAreaPrimitive.Viewport.Props>
) => (
  <ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" {...props} />
);

export const ScrollBar = ({
  orientation = "vertical",
  ...props
}: Readonly<Omit<ScrollAreaPrimitive.Scrollbar.Props, "children">>) => (
  <ScrollAreaPrimitive.Scrollbar
    data-slot="scroll-area-scrollbar"
    data-orientation={orientation}
    orientation={orientation}
    {...props}
  >
    <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" />
  </ScrollAreaPrimitive.Scrollbar>
);
