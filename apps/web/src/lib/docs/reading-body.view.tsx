import { Link } from "@tanstack/react-router";
import type { DocsReadingBody } from "@taxkit/content/schemas";
import { MdxBody } from "@taxkit/mdx-react/body";
import type { MdxLinkProps } from "@taxkit/mdx-react/body";
import { Option, Record } from "effect";

import { DocsCodeBlock } from "./code-block.view";
import { useDocsNavigationFocus } from "./focus.container";

const pageLinkPattern = /^(?<path>\/[^#]*)(?:#(?<hash>.+))?$/u;
// Content resolved every link: a public page path, a same-page fragment or an
// HTTPS address. Only page paths go through the router.
const DocsInlineLink = ({ children, href }: MdxLinkProps) => {
  const requestDocsNavigationFocus = useDocsNavigationFocus();
  return Option.fromNullishOr(pageLinkPattern.exec(href)?.groups).pipe(
    Option.match({
      onNone: () => <a href={href}>{children}</a>,
      onSome: (page) => (
        <Link
          {...Option.match(
            Record.get(page, "hash").pipe(Option.flatMap(Option.fromNullishOr)),
            {
              onNone: () => ({}),
              onSome: (hash) => ({ hash }),
            }
          )}
          onClick={requestDocsNavigationFocus}
          params={{
            _splat: Record.get(page, "path").pipe(
              Option.flatMap(Option.fromNullishOr),
              Option.map((path) => path.slice(1)),
              Option.getOrElse(() => "")
            ),
          }}
          to="/$"
        >
          {children}
        </Link>
      ),
    })
  );
};
export const DocsReadingBodyView = ({
  body,
}: Readonly<{ body: DocsReadingBody }>) => (
  <MdxBody
    body={body}
    className="docs-reading-body"
    Code={DocsCodeBlock}
    Link={DocsInlineLink}
    tableLabel="Documentation table"
  />
);
