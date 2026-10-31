import { Array, Context, Effect, HashMap, Match, Option, Record } from "effect";

import { DocsPageReadError } from "./errors.js";
import { DocsLinkHref, DocsSourcePath } from "./schemas.js";
import type { DocsPagePath, DocsRepositoryProfile } from "./schemas.js";

// What one page's links can point to: every authored page by its source file,
// the repository revisions for file links, and the page being read.
export type DocsLinkTargets = Readonly<{
  pages: HashMap.HashMap<DocsSourcePath, DocsPagePath>;
  repository: DocsRepositoryProfile;
}>;

export const DocsLinkTargets = Context.Service<DocsLinkTargets>(
  "@taxkit/content/DocsLinkTargets"
);

export type DocsLinkContext = DocsLinkTargets &
  Readonly<{
    source: DocsSourcePath;
  }>;

const docsRoot = "content/docs";
const examplesRoot = "packages/docs-examples/";
const hrefPattern = /^(?<path>[^#]*)(?<fragment>#.*)?$/u;

// Resolve relative segments against a folder, refusing to leave the
// repository root.
const joinSegments = (
  base: readonly string[],
  relative: readonly string[]
): Option.Option<readonly string[]> =>
  Array.reduce(relative, Option.some(base), (current, segment) =>
    Option.flatMap(current, (segments) =>
      Match.value(segment).pipe(
        Match.whenOr("", ".", () => Option.some(segments)),
        Match.when("..", () =>
          Array.isReadonlyArrayNonEmpty(segments)
            ? Option.some(Array.dropRight(segments, 1))
            : Option.none()
        ),
        Match.orElse(() => Option.some(Array.append(segments, segment)))
      )
    )
  );

// A relative `.mdx` link becomes the target page's public address. Any other
// relative link names a repository file and becomes a GitHub link at the
// recorded revision. HTTPS links and same-page fragments stay as written.
export const resolveDocsHref = (
  href: string,
  context: DocsLinkContext
): Effect.Effect<DocsLinkHref, DocsPageReadError> => {
  const fail = new DocsPageReadError({
    message: "The page links to an unknown page or an unsupported address.",
    reason: "link",
    source: context.source,
  });
  const checkedHref = (value: string) =>
    DocsLinkHref.makeEffect(value).pipe(Effect.mapError(() => fail));
  return Match.value(href).pipe(
    Match.when(
      (value) => value.startsWith("https://") || value.startsWith("#"),
      checkedHref
    ),
    Match.when(
      (value) => /^[a-z][a-z0-9+.-]*:/iu.test(value) || value.startsWith("/"),
      () => Effect.fail(fail)
    ),
    Match.orElse((value) => {
      const groups = Option.fromNullishOr(hrefPattern.exec(value)?.groups);
      const part = (name: string) =>
        groups.pipe(
          Option.flatMap(Record.get(name)),
          // An unmatched optional group is present but undefined.
          Option.flatMap(Option.fromNullishOr),
          Option.getOrElse(() => "")
        );
      const fragment = part("fragment");
      return joinSegments(
        Array.dropRight(`${docsRoot}/${context.source}`.split("/"), 1),
        part("path").split("/")
      ).pipe(
        Option.map((segments) => segments.join("/")),
        Effect.fromOption,
        Effect.mapError(() => fail),
        Effect.flatMap((target) =>
          target.startsWith(`${docsRoot}/`) && target.endsWith(".mdx")
            ? DocsSourcePath.makeEffect(target.slice(docsRoot.length + 1)).pipe(
                Effect.flatMap((source) =>
                  Effect.fromOption(HashMap.get(context.pages, source))
                ),
                Effect.mapError(() => fail),
                Effect.flatMap((page) => checkedHref(`${page}${fragment}`))
              )
            : checkedHref(
                `${context.repository.repositoryUrl.href.replace(/\/$/u, "")}/blob/${
                  target.startsWith(examplesRoot)
                    ? context.repository.checkedExampleRevision
                    : context.repository.repositoryRevision
                }/${target}${fragment}`
              )
        )
      );
    })
  );
};
