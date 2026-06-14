import { Match, Option } from "effect";
import type {
  Folder,
  Item,
  Node,
  Root,
  Separator,
} from "fumadocs-core/page-tree";

import type {
  FumadocsPageTreeFolder,
  FumadocsPageTreeFolderLink,
  FumadocsPageTreeNode,
  FumadocsPageTreePage,
  FumadocsPageTreeRoot,
  FumadocsPageTreeSeparator,
} from "./schemas.js";

const mapPageItem = ({
  description,
  external,
  icon,
  name,
  url,
}: FumadocsPageTreeFolderLink | FumadocsPageTreePage): Item => ({
  ...Option.fromUndefinedOr(description).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ description: value }),
    })
  ),
  ...Option.fromUndefinedOr(external).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ external: value }),
    })
  ),
  ...Option.fromUndefinedOr(icon).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ icon: value }),
    })
  ),
  name,
  type: "page",
  url,
});

const mapSeparator = ({
  icon,
  name,
}: FumadocsPageTreeSeparator): Separator => ({
  ...Option.fromUndefinedOr(icon).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ icon: value }),
    })
  ),
  ...Option.fromUndefinedOr(name).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ name: value }),
    })
  ),
  type: "separator",
});

const mapFolder = (
  value: FumadocsPageTreeFolder | FumadocsPageTreeFolderLink,
  children: Node[]
): Folder => ({
  ...Option.fromUndefinedOr(value.collapsible).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (collapsible) => ({ collapsible }),
    })
  ),
  ...Option.fromUndefinedOr(value.defaultOpen).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (defaultOpen) => ({ defaultOpen }),
    })
  ),
  ...Option.fromUndefinedOr(value.description).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (description) => ({ description }),
    })
  ),
  ...Option.fromUndefinedOr(value.icon).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (icon) => ({ icon }),
    })
  ),
  ...Option.fromUndefinedOr(value.root).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (root) => ({ root }),
    })
  ),
  ...Match.value(value).pipe(
    Match.when({ type: "folder-link" }, (folder) => ({
      index: mapPageItem(folder),
    })),
    Match.orElse(() => ({}))
  ),
  children,
  name: value.name,
  type: "folder",
});

export const mapPageTreeNode = (node: FumadocsPageTreeNode): Node =>
  Match.value(node).pipe(
    Match.when({ type: "page" }, mapPageItem),
    Match.when({ type: "separator" }, mapSeparator),
    Match.when({ type: "folder" }, (folder) =>
      mapFolder(folder, globalThis.Array.from(folder.children, mapPageTreeNode))
    ),
    Match.when({ type: "folder-link" }, (folder) =>
      mapFolder(folder, globalThis.Array.from(folder.children, mapPageTreeNode))
    ),
    Match.exhaustive
  );

export const createPageTreeRoot = ({
  children,
  description,
  name,
}: FumadocsPageTreeRoot): Root => ({
  ...Option.fromUndefinedOr(description).pipe(
    Option.match({
      onNone: () => ({}),
      onSome: (value) => ({ description: value }),
    })
  ),
  children: globalThis.Array.from(children, mapPageTreeNode),
  name,
});
