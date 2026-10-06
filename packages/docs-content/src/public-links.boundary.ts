import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { Array, HashMap, Option } from "effect";
import type { Root } from "mdast";
import type { Transformer } from "unified";
import { map } from "unist-util-map";

import type { DocsPublicLinkProfile } from "./public-links.schema.ts";
import { DocsSourcePath } from "./schemas.ts";
import type { DocsNavigation } from "./schemas.ts";

// Fumadocs owns parsing, highlighting, HTML compilation and Markdown output.
// This synchronous compiler callback maps only the SDK's parsed link nodes.
// VFile.fail is the compiler's failure protocol; source Layers contain it in
// their safe source error. Neither the source text nor the supplied tree mutates.
export const remarkPublicDocsLinks = ({
  contentRoot,
  navigation,
  profile,
  repositoryRoot,
}: Readonly<{
  contentRoot: URL;
  navigation: DocsNavigation;
  profile: DocsPublicLinkProfile;
  repositoryRoot: URL;
}>): Transformer<Root, Root> => {
  const pages = Array.flatMap(navigation.primaryNavigation, (section) => [
    section,
    ...(section.pages ?? []),
  ]);
  const addresses = HashMap.fromIterable(
    Array.map(pages, (page) => [page.source, page.path] as const)
  );
  const contentDirectory = fileURLToPath(contentRoot);
  const repositoryDirectory = fileURLToPath(repositoryRoot);

  return (tree, file) => {
    // VFile's declared string getter can return undefined before a path is set.
    const sourcePath = Option.fromNullishOr(file.path).pipe(
      Option.filter((value) => value.length > 0)
    );
    if (Option.isNone(sourcePath)) {
      return file.fail("The documentation compiler needs a source path.");
    }
    const updated = map(tree, (node) => {
      if (node.type !== "link" && node.type !== "definition") {
        return node;
      }
      const href = node.url;
      if (
        href.startsWith("#") ||
        href.startsWith("?") ||
        href.startsWith("//") ||
        /^[a-z][a-z0-9+.-]*:/iu.test(href)
      ) {
        return node;
      }
      if (href.startsWith("/")) {
        const target = URL.parse(href, "https://taxkit.dev");
        if (
          target === null ||
          !Array.some(pages, (page) => page.path === target.pathname)
        ) {
          return file.fail("The documentation address is not in navigation.");
        }
        return { ...node, url: href };
      }
      const target = URL.parse(href, pathToFileURL(sourcePath.value));
      if (target === null || target.protocol !== "file:") {
        return file.fail("The documentation link could not be resolved.");
      }
      const destination = fileURLToPath(target);
      const repositoryPath = path.relative(repositoryDirectory, destination);
      if (
        repositoryPath === ".." ||
        repositoryPath.startsWith(`..${path.sep}`)
      ) {
        return file.fail("The documentation link leaves the repository.");
      }
      const contentPath = path
        .relative(contentDirectory, destination)
        .split(path.sep)
        .join("/");
      if (contentPath.endsWith(".mdx")) {
        return HashMap.get(
          addresses,
          DocsSourcePath.make(`content/${contentPath}`)
        ).pipe(
          Option.match({
            onNone: () =>
              file.fail("The documentation source is not in navigation."),
            onSome: (address) => ({
              ...node,
              url: `${address}${target.search}${target.hash}`,
            }),
          })
        );
      }
      const encodedPath = Array.map(
        repositoryPath.split(path.sep),
        encodeURIComponent
      ).join("/");
      return {
        ...node,
        url: `${profile.repositoryUrl.href}/blob/${profile.repositoryRevision}/${encodedPath}${target.search}${target.hash}`,
      };
    });
    if (updated.type !== "root") {
      return file.fail("The documentation compiler returned an invalid root.");
    }
    return updated;
  };
};
