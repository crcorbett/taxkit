import { Link, useLocation } from "@tanstack/react-router";
import { Picture, Pre } from "@taxkit/docs-fumadocs/render";
import type { ComponentPropsWithoutRef, MouseEvent } from "react";

const focusIntentAttribute = "data-docs-focus-heading";

// Focus is a local browser command shared by navigation and compiled MDX.
// Only ordinary route clicks record intent; hydration never does.
export const requestDocsNavigationFocus = (
  event: MouseEvent<HTMLAnchorElement>
) => {
  if (
    event.button === 0 &&
    !event.defaultPrevented &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey
  ) {
    document.documentElement.setAttribute(focusIntentAttribute, "true");
  }
};

const DocsMdxLink = ({
  "aria-label": ariaLabel,
  children,
  download,
  href,
  ...props
}: Readonly<ComponentPropsWithoutRef<"a">>) => {
  const currentPath = useLocation({ select: (location) => location.pathname });
  if (
    href === undefined ||
    download !== undefined ||
    props.target !== undefined ||
    href.startsWith("#") ||
    href.startsWith("//") ||
    /^[a-z][a-z0-9+.-]*:/iu.test(href) ||
    !(
      href.startsWith("/") ||
      href.startsWith("?") ||
      /\.mdx(?=$|[?#])/u.test(href)
    )
  ) {
    return (
      <a
        {...props}
        {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
        download={download}
        href={href}
      >
        {children}
      </a>
    );
  }
  // This inert base resolves authored relative links only. It is never a
  // request address, public origin or configuration fallback.
  const destination = new URL(
    href.replace(/\.mdx(?=$|[?#])/u, ""),
    `https://taxkit.invalid${currentPath}`
  );
  return (
    <Link
      {...(ariaLabel === undefined ? {} : { "aria-label": ariaLabel })}
      {...(props.className === undefined ? {} : { className: props.className })}
      {...(props.id === undefined ? {} : { id: props.id })}
      {...(props.title === undefined ? {} : { title: props.title })}
      onClick={(event) => {
        props.onClick?.(event);
        requestDocsNavigationFocus(event);
      }}
      to={`${destination.pathname}${destination.search}${destination.hash}`}
    >
      {children}
    </Link>
  );
};

export const DocsHeading = ({
  children,
  ...props
}: Readonly<ComponentPropsWithoutRef<"h1">>) => (
  <h1
    {...props}
    ref={(heading) => {
      if (
        heading !== null &&
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

/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- A labelled horizontal table scroll region needs explicit keyboard focus across supported browsers. */
const DocsMdxTable = ({
  children,
  ...props
}: Readonly<ComponentPropsWithoutRef<"table">>) => (
  <section
    aria-label="Documentation table"
    className="docs-table-scroll"
    tabIndex={0}
  >
    <table {...props}>{children}</table>
  </section>
);
/* oxlint-enable jsx-a11y/no-noninteractive-tabindex */

export const docsMdxComponents = {
  a: DocsMdxLink,
  h1: DocsHeading,
  img: Picture,
  pre: Pre,
  table: DocsMdxTable,
};
