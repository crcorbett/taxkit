import { useAtomSet, useAtomValue } from "@effect/atom-react";
import type { DocsReadingBody } from "@taxkit/content/schemas";
import * as Atom from "effect/reactivity/Atom";
import { useEffect, useMemo } from "react";

import { createDocsOutline } from "./outline.atoms";

export const useDocsOutline = (body: DocsReadingBody) => {
  const atoms = useMemo(() => createDocsOutline(body), [body]);
  const observe = useAtomSet(atoms.observe);
  const active = useAtomValue(atoms.active);
  // React owns the mount boundary; the existing Atom runtime owns the scope.
  useEffect(() => {
    observe("observe");
    return () => {
      observe(Atom.Interrupt);
    };
  }, [observe]);
  return active;
};
