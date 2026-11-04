import type { MouseEvent, ReactNode } from "react";

import { docsHeadingId } from "./focus.atoms";

// Focus is a local browser command shared by navigation and page links.
// Only ordinary route clicks record intent; hydration never does.
export const isDocsNavigationClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button === 0 &&
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !event.shiftKey;

export const DocsHeading = ({
  children,
}: Readonly<{ children: ReactNode }>) => (
  <h1 id={docsHeadingId} tabIndex={-1}>
    {children}
  </h1>
);
