import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import type {
  DocsContentPage,
  DocsNavigation as DocsNavigationValue,
} from "@taxkit/docs-content/schemas";
import { Array, Match, Option, Result, pipe } from "effect";
import { useState } from "react";

import {
  DocsRecoverableError,
  DocsRouteError,
  DocsRouteNotFound,
  DocsRoutePending,
} from "#/components/docs-route-states";
import { loadDocsPage } from "#/lib/docs/loaders";
import { docsPageRouteBoundary } from "#/lib/docs/route-boundary";
import { MdxDocument } from "#/lib/mdx/client-loader";
import { requestDocsNavigationFocus } from "#/lib/navigation-focus";
import { useHydrated } from "#/lib/use-hydrated";

type DocsPageRouteError = Result.Result.Failure<
  ReturnType<typeof docsPageRouteBoundary.restore>
>;

const DocsRouteFailure = ({
  error,
  onRetry,
}: Readonly<{
  error: DocsPageRouteError;
  onRetry: () => void;
}>) =>
  Match.value(error).pipe(
    Match.tags({
      DocsContentPreloadError: (preloadError) => (
        <DocsRecoverableError
          message={preloadError.message}
          onRetry={onRetry}
        />
      ),
      DocsRouteTransportError: () => (
        <DocsRecoverableError
          message="The documentation route data could not be read."
          onRetry={onRetry}
        />
      ),
      DocsSourceError: () => (
        <DocsRecoverableError
          message="The documentation source could not be loaded."
          onRetry={onRetry}
        />
      ),
    }),
    Match.exhaustive
  );

const DocsNavigation = ({
  currentPath,
  interactive,
  navigation,
  onNavigate,
  onToggle,
  open,
}: Readonly<{
  currentPath: DocsContentPage["path"];
  interactive: boolean;
  navigation: DocsNavigationValue;
  onNavigate: () => void;
  onToggle: () => void;
  open: boolean;
}>) => (
  <>
    <header className="docs-mobile-header">
      <Link className="docs-nav__home" to="/">
        TaxKit Docs
      </Link>
      <button
        aria-controls="docs-navigation"
        aria-expanded={open}
        className="docs-nav-toggle"
        onClick={onToggle}
        type="button"
      >
        {open ? "Close navigation" : "Open navigation"}
      </button>
    </header>
    <nav
      aria-label="Documentation"
      className="docs-nav"
      data-open={open}
      data-tk-navigation-interactive={interactive ? "true" : "false"}
      id="docs-navigation"
    >
      <Link className="docs-nav__home docs-nav__home--desktop" to="/">
        TaxKit Docs
      </Link>
      {pipe(
        navigation.primaryNavigation,
        Array.map((section) => (
          <section className="docs-nav__section" key={section.path}>
            <Link
              className="docs-nav__section-link"
              onClick={() => {
                requestDocsNavigationFocus();
                onNavigate();
              }}
              params={{ _splat: section.path.slice(1) }}
              to="/$"
            >
              {section.title}
            </Link>
            {Option.fromUndefinedOr(section.pages).pipe(
              Option.match({
                onNone: () => null,
                onSome: (items) => (
                  <div className="docs-nav__links">
                    {pipe(
                      items,
                      Array.map((item) => (
                        <Link
                          className="docs-nav__link"
                          aria-current={
                            item.path === currentPath ? "page" : undefined
                          }
                          key={item.path}
                          onClick={() => {
                            requestDocsNavigationFocus();
                            onNavigate();
                          }}
                          params={{ _splat: item.path.slice(1) }}
                          to="/$"
                        >
                          {item.title}
                        </Link>
                      ))
                    )}
                  </div>
                ),
              })
            )}
          </section>
        ))
      )}
    </nav>
  </>
);

const DocsArticle = ({ page }: { readonly page: DocsContentPage }) => (
  <article className="docs-article">
    <div className="docs-article__meta">
      <span>{page.frontmatter.status}</span>
      <span>{page.source}</span>
    </div>
    <MdxDocument source={page.source} />
  </article>
);

const DocsPageLayout = ({
  interactive,
  navigation,
  onNavigate,
  onToggle,
  open,
  page,
}: Readonly<{
  interactive: boolean;
  navigation: DocsNavigationValue;
  onNavigate: () => void;
  onToggle: () => void;
  open: boolean;
  page: DocsContentPage;
}>) => (
  <div className="docs-page-layout">
    <DocsNavigation
      currentPath={page.path}
      interactive={interactive}
      navigation={navigation}
      onNavigate={onNavigate}
      onToggle={onToggle}
      open={open}
    />
    <DocsArticle page={page} />
  </div>
);

const DocsPageContainer = ({
  navigation,
  page,
}: Readonly<{
  navigation: DocsNavigationValue;
  page: DocsContentPage;
}>) => {
  const interactive = useHydrated();
  const [navigationOpen, setNavigationOpen] = useState(false);

  const toggleNavigation = () => {
    const opening = !navigationOpen;

    setNavigationOpen(opening);
    if (opening) {
      requestAnimationFrame(() => {
        const navigationElement =
          document.querySelector<HTMLElement>(".docs-nav");

        if (navigationElement === null) {
          return;
        }

        const currentLink = navigationElement.querySelector<HTMLElement>(
          '[aria-current="page"]'
        );

        if (currentLink !== null) {
          navigationElement.scrollTo({
            behavior: "instant",
            top:
              currentLink.offsetTop -
              navigationElement.clientHeight / 2 +
              currentLink.clientHeight / 2,
          });
        }
      });
    }
  };

  return (
    <DocsPageLayout
      interactive={interactive}
      navigation={navigation}
      onNavigate={() => setNavigationOpen(false)}
      onToggle={toggleNavigation}
      open={navigationOpen}
      page={page}
    />
  );
};

export const Route = createFileRoute("/$")({
  component: function DocsPageRoute() {
    const loaderData = Route.useLoaderData();
    const router = useRouter();
    const routeResult = docsPageRouteBoundary.restore(loaderData);

    return Result.match(routeResult, {
      onFailure: (error) => (
        <DocsRouteFailure
          error={error}
          onRetry={() => {
            void router.invalidate();
          }}
        />
      ),
      onSuccess: ({ navigation, page }) => (
        <DocsPageContainer navigation={navigation} page={page} />
      ),
    });
  },
  errorComponent: DocsRouteError,
  loader: loadDocsPage,
  notFoundComponent: DocsRouteNotFound,
  pendingComponent: DocsRoutePending,
  pendingMs: 150,
});
