import { Predicate } from "effect";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

const focusIntentAttribute = "data-docs-focus-heading";

export const requestDocsHeadingFocus = () => {
  document.documentElement.setAttribute(focusIntentAttribute, "true");
};

// Focus is a local browser command shared by navigation and page links.
// Only ordinary route clicks record intent; hydration never does.
export const isDocsNavigationClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const requestDocsNavigationFocus = (
  event: MouseEvent<HTMLAnchorElement>
) => {
  if (isDocsNavigationClick(event)) {
    requestDocsHeadingFocus();
  }
};

export const DocsHeading = ({
  children,
  ...props
}: Readonly<ComponentPropsWithoutRef<"h1">>) => (
  <h1
    id="taxkit-docs-content"
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
