import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

export const Collapsible = (
  props: Readonly<CollapsiblePrimitive.Root.Props>
) => <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;

export const CollapsibleTrigger = (
  props: Readonly<CollapsiblePrimitive.Trigger.Props>
) => (
  <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" {...props} />
);

export const CollapsibleContent = (
  props: Readonly<CollapsiblePrimitive.Panel.Props>
) => <CollapsiblePrimitive.Panel data-slot="collapsible-content" {...props} />;
