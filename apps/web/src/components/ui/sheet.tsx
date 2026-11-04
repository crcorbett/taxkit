import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import type { ComponentProps } from "react";

export const Sheet = (props: Readonly<SheetPrimitive.Root.Props>) => (
  <SheetPrimitive.Root {...props} />
);

export const SheetTrigger = (props: Readonly<SheetPrimitive.Trigger.Props>) => (
  <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
);

export const SheetClose = (props: Readonly<SheetPrimitive.Close.Props>) => (
  <SheetPrimitive.Close data-slot="sheet-close" {...props} />
);

export const SheetPortal = (props: Readonly<SheetPrimitive.Portal.Props>) => (
  <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
);

export const SheetOverlay = (
  props: Readonly<SheetPrimitive.Backdrop.Props>
) => <SheetPrimitive.Backdrop data-slot="sheet-overlay" {...props} />;

export const SheetContent = ({
  side = "right",
  ...props
}: Readonly<
  SheetPrimitive.Popup.Props & {
    side?: "top" | "right" | "bottom" | "left";
  }
>) => (
  <SheetPrimitive.Popup data-slot="sheet-content" data-side={side} {...props} />
);

export const SheetHeader = (props: Readonly<ComponentProps<"div">>) => (
  <div data-slot="sheet-header" {...props} />
);

export const SheetTitle = (props: Readonly<SheetPrimitive.Title.Props>) => (
  <SheetPrimitive.Title data-slot="sheet-title" {...props} />
);

export const SheetDescription = (
  props: Readonly<SheetPrimitive.Description.Props>
) => <SheetPrimitive.Description data-slot="sheet-description" {...props} />;
