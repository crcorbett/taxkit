import { Link, useRouterState } from "@tanstack/react-router";
import type {
  DocsPublicNavigation,
  DocsPublicPage,
  DocsPageMetadata,
} from "@taxkit/content/schemas";
import { Boolean as EffectBoolean } from "effect";
import type { Option } from "effect";
import {
  ArrowUp,
  ArrowUpRight,
  FileText,
  GitFork,
  Search,
  SquareTerminal,
} from "lucide-react";

import { buttonVariants } from "#/components/ui/button";

import { DocsAppearance } from "./appearance.container";
import { docsHeadingId } from "./focus.atoms";
import { useDocsNavigationFocus } from "./focus.container";
import { DocsMenu } from "./menu.container";
import { DocsNavigation } from "./page.view";

const repositoryUrl = "https://github.com/crcorbett/taxkit";

export const DocsHeader = ({
  currentPath,
  navigation,
}: Readonly<{
  currentPath: Option.Option<DocsPublicPage["path"]>;
  navigation: DocsPublicNavigation;
}>) => {
  const requestDocsNavigationFocus = useDocsNavigationFocus();
  const loading = useRouterState({ select: (state) => state.isLoading });
  return (
    <>
      <header className="docs-header" data-mdx-appearance-controls="">
        <output aria-live="polite" className="docs-loading-status">
          {EffectBoolean.match(loading, {
            onTrue: () => "Loading page…",
            onFalse: () => "",
          })}
        </output>
        <div className="docs-header-inner">
          <div className="docs-header-brand">
            <DocsMenu currentPath={currentPath} navigation={navigation} />
            <Link
              className="docs-wordmark"
              onClick={requestDocsNavigationFocus}
              params={{ _splat: "start" }}
              to="/$"
            >
              <SquareTerminal aria-hidden="true" size={25} />
              <span>TaxKit</span>
            </Link>
            <span className="docs-header-label">Docs</span>
          </div>
          <nav aria-label="TaxKit" className="docs-header-links">
            <Link
              className="docs-header-current"
              onClick={requestDocsNavigationFocus}
              params={{ _splat: "start/quickstart" }}
              to="/$"
            >
              Documentation
            </Link>
            <Link to="/">Calculators</Link>
            <Link
              onClick={requestDocsNavigationFocus}
              params={{ _splat: "api" }}
              to="/$"
            >
              API reference
            </Link>
          </nav>
          <div className="docs-header-actions">
            <Link
              {...buttonVariants({ variant: "outline" })}
              aria-label="Search documentation"
              className="docs-search-trigger"
              onClick={requestDocsNavigationFocus}
              to="/search"
            >
              <Search aria-hidden="true" size={18} />
              <span>Search documentation</span>
            </Link>
            <a
              {...buttonVariants({ size: "icon", variant: "ghost" })}
              aria-label="TaxKit on GitHub"
              className="docs-github-link"
              href={repositoryUrl}
            >
              <GitFork aria-hidden="true" size={18} />
            </a>
            <DocsAppearance />
          </div>
        </div>
      </header>
      <noscript>
        <style>
          {
            ".docs-menu-trigger,.docs-copy-control,.docs-nav-section-toggle{display:none!important}"
          }
        </style>
        <details className="docs-noscript-navigation">
          <summary>Browse documentation</summary>
          <DocsNavigation currentPath={currentPath} navigation={navigation} />
        </details>
      </noscript>
    </>
  );
};

export const DocsPageActions = ({
  markdown,
  source,
}: Readonly<{
  markdown: DocsPageMetadata["markdown"];
  source: DocsPublicPage["source"];
}>) => (
  <div className="docs-page-actions">
    <a href={`${repositoryUrl}/edit/main/content/docs/${source}`}>
      <GitFork aria-hidden="true" size={15} />
      Edit this page
      <ArrowUpRight
        aria-hidden="true"
        className="docs-action-arrow"
        size={13}
      />
    </a>
    <a href={markdown}>
      <FileText aria-hidden="true" size={15} />
      Read as Markdown
    </a>
    <a href={`#${docsHeadingId}`}>
      <ArrowUp aria-hidden="true" size={15} />
      Back to top
    </a>
  </div>
);
