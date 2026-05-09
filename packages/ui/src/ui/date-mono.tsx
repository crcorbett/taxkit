import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { format, parseISO } from "date-fns";

import { cn } from "@/lib/utils";

/*
 * DateMono — single source of truth for date rendering (DESIGN.md §6.1).
 *
 * Format: "25 Apr 2026" (date-fns "d MMM yyyy"). Renders as <time> with a
 * machine-readable dateTime attribute set to the ISO date. Agents must
 * not format dates ad-hoc — every date-bearing component should compose
 * this one. cva drives size + tone variants so consumers don't reach
 * for raw className overrides.
 */

const dateMonoVariants = cva("font-mono", {
  defaultVariants: {
    size: "default",
    tone: "muted",
  },
  variants: {
    size: {
      default: "text-sm",
      lg: "text-base",
      sm: "text-xs",
    },
    tone: {
      muted: "text-fg-muted",
      strong: "text-foreground",
      subtle: "text-fg-subtle",
    },
  },
});

type DateInput = Date | string | number;

interface DateMonoOwnProps extends VariantProps<typeof dateMonoVariants> {
  /** ISO 8601 string, Date, or epoch ms. Strings are parsed via parseISO. */
  value: DateInput;
}

function toDate(value: DateInput): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "string") {
    return parseISO(value);
  }
  return new Date(value);
}

function DateMono({
  value,
  size,
  tone,
  className,
  render,
  ...props
}: DateMonoOwnProps &
  Omit<useRender.ComponentProps<"time">, "dateTime" | "children">) {
  const date = toDate(value);
  const display = format(date, "d MMM yyyy");
  const iso = date.toISOString().slice(0, 10);

  return useRender({
    defaultTagName: "time",
    props: mergeProps<"time">(
      {
        children: display,
        className: cn(dateMonoVariants({ size, tone }), className),
        dateTime: iso,
      },
      props
    ),
    render,
    state: { size, slot: "date-mono", tone },
  });
}

export { DateMono, dateMonoVariants };
