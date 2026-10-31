import { Link } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
} from "@taxkit/content/schemas";
import {
  Function as EffectFunction,
  Array,
  Option,
  Boolean as EffectBoolean,
} from "effect";

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
      {EffectFunction.pipe(
        navigation.primaryNavigation,
        Array.map((section) => (
          <section key={section.path}>
            <Link
              activeOptions={{ exact: true }}
              aria-current={EffectBoolean.match(
                Option.contains(currentPath, section.path),
                {
                  onFalse: EffectFunction.constUndefined,
                  onTrue: (): "page" => "page",
                }
              )}
              onClick={requestDocsNavigationFocus}
              params={{ _splat: section.path.slice(1) }}
              to="/$"
            >
              {section.title}
            </Link>
            <ul>
              {EffectFunction.pipe(
                section.pages,
                Array.map((item) => (
                  <li key={item.path}>
                    <Link
                      activeOptions={{ exact: true }}
                      aria-current={EffectBoolean.match(
                        Option.contains(currentPath, item.path),
                        {
                          onFalse: EffectFunction.constUndefined,
                          onTrue: (): "page" => "page",
                        }
                      )}
                      onClick={requestDocsNavigationFocus}
                      params={{ _splat: item.path.slice(1) }}
                      to="/$"
                    >
                      {item.title}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </section>
        ))
      )}
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
