import { Link } from "@tanstack/react-router";
import { SquareTerminal, Search, ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

import { buttonVariants } from "#/components/ui/button-variants";
import { RetryButton } from "#/lib/pages/retry.container";

import { DocsAppearance } from "./appearance.container";
import { DocsHeading } from "./components";
import { useDocsNavigationFocus } from "./focus.container";
import { docsStartSplat } from "./schemas";

// Without a checked page, the recovery view uses accessible platform colours
// rather than inventing or caching a replacement MDX theme.
export const DocsState = ({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) => {
  const requestDocsNavigationFocus = useDocsNavigationFocus();
  return (
    <section className="docs-reader docs-unavailable" data-mdx-theme="">
      <header className="docs-header" data-mdx-appearance-controls="">
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
              {...buttonVariants({ size: "icon", variant: "ghost" })}
              aria-label="Search documentation"
              onClick={requestDocsNavigationFocus}
              to="/search"
            >
              <Search aria-hidden="true" size={18} />
            </Link>
            <DocsAppearance />
          </div>
        </div>
      </header>
      <main className="docs-state" id="main-content" tabIndex={-1}>
        <div className="docs-breadcrumbs">Documentation</div>
        <DocsHeading>{title}</DocsHeading>
        {children}
        <nav
          aria-label="Documentation recovery"
          className="docs-recovery-links"
        >
          <Link
            onClick={requestDocsNavigationFocus}
            params={{ _splat: docsStartSplat }}
            to="/$"
          >
            Open the Quickstart <ArrowRight aria-hidden="true" size={16} />
          </Link>
          <Link to="/">Go to the calculators</Link>
        </nav>
      </main>
    </section>
  );
};

export const DocsPageUnavailable = () => (
  <DocsState title="Documentation could not load">
    <p role="alert">Try again, or choose another place to start.</p>
    <RetryButton />
  </DocsState>
);

export const DocsPageNotFound = () => {
  const requestDocsNavigationFocus = useDocsNavigationFocus();
  return (
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
};
