import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import { Array, Function as EffectFunction, Option } from "effect";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { requestDocsNavigationFocus } from "./components";

export const DocsPager = ({
  navigation,
  currentPath,
}: Readonly<{
  navigation: DocsPublicNavigation;
  currentPath: DocsPublicPage["path"];
}>) => {
  const pages = EffectFunction.pipe(
    navigation.primaryNavigation,
    Array.flatMap((section) => [section, ...section.pages])
  );
  return EffectFunction.pipe(
    pages,
    Array.findFirstIndex((page) => page.path === currentPath),
    Option.match({
      onNone: () => null,
      onSome: (index) => (
        <nav aria-label="Previous and next pages" className="docs-pager">
          {Option.match(Array.get(pages, index - 1), {
            onNone: () => <span />,
            onSome: (page) => (
              <Link
                onClick={requestDocsNavigationFocus}
                params={{ _splat: page.path.slice(1) }}
                to="/$"
              >
                <span className="docs-pager-label">
                  <ArrowLeft aria-hidden="true" size={16} /> Previous
                </span>
                <span className="docs-pager-title">{page.title}</span>
              </Link>
            ),
          })}
          {Option.match(Array.get(pages, index + 1), {
            onNone: () => <span />,
            onSome: (page) => (
              <Link
                className="docs-pager-next"
                onClick={requestDocsNavigationFocus}
                params={{ _splat: page.path.slice(1) }}
                to="/$"
              >
                <span className="docs-pager-label">
                  Next <ArrowRight aria-hidden="true" size={16} />
                </span>
                <span className="docs-pager-title">{page.title}</span>
              </Link>
            ),
          })}
        </nav>
      ),
    })
  );
};
