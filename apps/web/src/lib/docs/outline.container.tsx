import { useAtomMount, useAtomValue } from "@effect/atom-react";
import type { DocsHeadingId, DocsReadingBody } from "@taxkit/content/schemas";
import { Array, Function as EffectFunction } from "effect";
import type { Option } from "effect";
import type * as Atom from "effect/reactivity/Atom";

import { docsOutlineAtoms } from "./outline.atoms";
import { DocsOutlineView } from "./outline.view";

export const useDocsOutline = (body: DocsReadingBody) => {
  const atoms = EffectFunction.pipe(
    body,
    Array.filter((block) => block.kind === "heading"),
    Array.map(({ id }) => id),
    docsOutlineAtoms
  );
  // The page mounts one observer without subscribing the article to scrolling.
  // Native Atom disposal interrupts the resource and disconnects its observer.
  useAtomMount(atoms.observe);
  return atoms.active;
};

export const DocsOutline = ({
  body,
  active,
}: Readonly<{
  body: DocsReadingBody;
  active: Atom.Atom<Option.Option<DocsHeadingId>>;
}>) => <DocsOutlineView active={useAtomValue(active)} body={body} />;
