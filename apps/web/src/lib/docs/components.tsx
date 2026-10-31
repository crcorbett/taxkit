import { Predicate } from "effect";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

const focusIntentAttribute = "data-docs-focus-heading";

// Focus is a local browser command shared by navigation and page links.
// Only ordinary route clicks record intent; hydration never does.
export const requestDocsNavigationFocus = (
  event: MouseEvent<HTMLAnchorElement>
) => {
  if (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    document.documentElement.setAttribute(focusIntentAttribute, "true");
  }
};

export const DocsHeading = ({
  children,
  ...props
}: Readonly<ComponentPropsWithoutRef<"h1">>) => (
  <h1
    {...props}
    ref={(heading) => {
      if (
        !Predicate.isNull(heading) &&
        document.documentElement.getAttribute(focusIntentAttribute) === "true"
      ) {
        document.documentElement.removeAttribute(focusIntentAttribute);
        heading.focus();
      }
    }}
    tabIndex={-1}
  >
    {children}
  </h1>
);
