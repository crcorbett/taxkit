import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import { Array, Option } from "effect";

import { requestDocsNavigationFocus } from "./components";

export const DocsNavigation = ({
  currentPath,
  navigation,
}: {
  readonly currentPath: Option.Option<DocsPublicPage["path"]>;
  readonly navigation: DocsPublicNavigation;
}) => (
  <details className="docs-navigation-panel" open>
    <summary>Documentation navigation</summary>
    <Link onClick={requestDocsNavigationFocus} to="/search">
      Search documentation
    </Link>
    <nav aria-label="Documentation" className="docs-navigation">
      {Array.map(navigation.primaryNavigation, (section) => (
        <section key={section.path}>
          <Link
            activeOptions={{ exact: true }}
            aria-current={
              Option.contains(currentPath, section.path) ? "page" : undefined
            }
            onClick={requestDocsNavigationFocus}
            params={{ _splat: section.path.slice(1) }}
            to="/$"
          >
            {section.title}
          </Link>
          <ul>
            {Array.map(section.pages, (item) => (
              <li key={item.path}>
                <Link
                  activeOptions={{ exact: true }}
                  aria-current={
                    Option.contains(currentPath, item.path) ? "page" : undefined
                  }
                  onClick={requestDocsNavigationFocus}
                  params={{ _splat: item.path.slice(1) }}
                  to="/$"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  </details>
);

export const DocsPageUnavailable = () => (
  <section className="docs-state" role="alert">
    <h1>Documentation could not load</h1>
    <p>Please reload this page to try again.</p>
    <a href="/start/quickstart">Open the Quickstart</a>
  </section>
);

export const DocsPageNotFound = () => (
  <section className="docs-state">
    <h1>Documentation page not found</h1>
    <p>Choose a page from the documentation navigation.</p>
    <a href="/start/quickstart">Open the Quickstart</a>
  </section>
);
