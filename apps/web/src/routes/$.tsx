import { createFileRoute } from "@tanstack/react-router";
import { Array, Function as EffectFunction, Option } from "effect";
import { ChevronRight } from "lucide-react";

import { DocsHeader, DocsPageActions } from "#/lib/docs/chrome.view";
import { DocsHeading } from "#/lib/docs/components";
import { DocsCopyButton } from "#/lib/docs/copy-button.container";
import { DocsOutline, useDocsOutline } from "#/lib/docs/outline.container";
import { DocsMobileOutline } from "#/lib/docs/outline.view";
import { DocsNavigation } from "#/lib/docs/page.view";
import { DocsPager } from "#/lib/docs/pager.view";
import { DocsReader } from "#/lib/docs/reader.container";
import { DocsReadingBodyView } from "#/lib/docs/reading-body.view";
import type { WebsiteDocsPageView } from "#/lib/docs/schemas";
import { DocsPageNotFound, DocsPageUnavailable } from "#/lib/docs/state.view";
import { loadDocsPage } from "#/lib/pages/loaders";
import { docsHead } from "#/lib/seo/head";

export const Route = createFileRoute("/$")({
  component: DocumentationRoute,
  errorComponent: DocsPageUnavailable,
  // An explicit parameter type keeps loader inference independent of head.
  head: ({
    loaderData,
  }: Readonly<{ loaderData?: WebsiteDocsPageView | undefined }>) =>
    Option.fromNullishOr(loaderData).pipe(
      Option.map(({ metadata }) => docsHead(metadata)),
      Option.getOrElse(() => ({
        meta: [{ title: "Documentation | TaxKit" }],
      }))
    ),
  loader: ({ params, context, abortController }) =>
    loadDocsPage({
      context,
      path: `/${params._splat}`,
      signal: abortController.signal,
    }),
  notFoundComponent: DocsPageNotFound,
  // Native Router retains the resolved shell until the next page is ready.
  // A route-wide pending fallback would discard the reader's checked theme.
});

function DocumentationRoute() {
  const { metadata, navigation, page } = Route.useLoaderData();
  const activeHeadingAtom = useDocsOutline(page.body);
  const section = EffectFunction.pipe(
    navigation.primaryNavigation,
    Array.findFirst(
      (item) =>
        item.path === page.path ||
        EffectFunction.pipe(
          item.pages,
          Array.some((entry) => entry.path === page.path)
        )
    )
  );
  return (
    <DocsReader theme={page.theme}>
      <DocsHeader
        currentPath={Option.some(page.path)}
        navigation={navigation}
      />
      <div className="docs-layout">
        <aside className="docs-sidebar">
          <DocsNavigation
            currentPath={Option.some(page.path)}
            navigation={navigation}
          />
        </aside>
        <article className="docs-article">
          <DocsMobileOutline>
            <DocsOutline active={activeHeadingAtom} body={page.body} />
          </DocsMobileOutline>
          <header className="docs-article-header">
            <div className="docs-meta-row">
              <div className="docs-breadcrumbs">
                <span>Documentation</span>
                {EffectFunction.pipe(
                  Array.fromOption(section),
                  Array.map((parent) => (
                    <span className="docs-breadcrumb-section" key={parent.path}>
                      <ChevronRight aria-hidden="true" size={13} />
                      <span>{parent.title}</span>
                    </span>
                  ))
                )}
              </div>
              <div className="docs-copy-page">
                <DocsCopyButton
                  action="Copy page"
                  label="Copy page as Markdown"
                  text={page.markdown}
                />
              </div>
            </div>
            <DocsHeading>{page.frontmatter.title}</DocsHeading>
          </header>
          <div className="docs-reading-body">
            <DocsReadingBodyView body={page.body} />
          </div>
          <DocsPager currentPath={page.path} navigation={navigation} />
          <footer className="docs-article-footer">
            <p>TaxKit is open source. Help make these docs better.</p>
            <DocsPageActions
              markdown={metadata.markdown}
              source={page.source}
            />
          </footer>
        </article>
        <aside className="docs-page-sidebar">
          <div className="docs-page-sidebar-inner">
            <p className="docs-outline-title">On this page</p>
            <DocsOutline active={activeHeadingAtom} body={page.body} />
            <DocsPageActions
              markdown={metadata.markdown}
              source={page.source}
            />
          </div>
        </aside>
      </div>
      <div aria-hidden="true" className="docs-end-marker" />
    </DocsReader>
  );
}
