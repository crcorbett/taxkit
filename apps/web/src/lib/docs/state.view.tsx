import { Link } from "@tanstack/react-router";
import { SquareTerminal, Search, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { DocsHeading, requestDocsNavigationFocus } from "./components";
import { DocsAppearance } from "./reader.container";

// Without a checked page, the recovery view uses accessible platform colours
// rather than inventing or caching a replacement MDX theme.
export const DocsState = ({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) => (
  <section className="docs-reader docs-unavailable">
    <header className="docs-header">
      <div className="docs-header-inner">
        <Link
          className="docs-wordmark"
          onClick={requestDocsNavigationFocus}
          params={{ _splat: "start" }}
          to="/$"
        >
          <SquareTerminal aria-hidden="true" size={25} />
          <span>TaxKit</span>
        </Link>
        <div className="docs-header-actions">
          <Link
            aria-label="Search documentation"
            className="docs-icon-button"
            onClick={requestDocsNavigationFocus}
            to="/search"
          >
            <Search aria-hidden="true" size={18} />
          </Link>
          <DocsAppearance />
        </div>
      </div>
    </header>
    <article className="docs-state">
      <div className="docs-breadcrumbs">Documentation</div>
      <DocsHeading>{title}</DocsHeading>
      {children}
      <nav aria-label="Documentation recovery" className="docs-recovery-links">
        <Link
          onClick={requestDocsNavigationFocus}
          params={{ _splat: "start/quickstart" }}
          to="/$"
        >
          Open the Quickstart <ArrowRight aria-hidden="true" size={16} />
        </Link>
        <Link to="/">Go to the calculators</Link>
      </nav>
    </article>
  </section>
);

export const DocsPageUnavailable = () => (
  <DocsState title="Documentation could not load">
    <p role="alert">
      Reload this page to try again, or choose another place to start.
    </p>
  </DocsState>
);

export const DocsPageNotFound = () => (
  <DocsState title="Documentation page not found">
    <p>
      This page may have moved. Start with the Quickstart or search the
      documentation.
    </p>
    <Link
      className="docs-recovery-search"
      onClick={requestDocsNavigationFocus}
      to="/search"
    >
      Search documentation
    </Link>
  </DocsState>
);
