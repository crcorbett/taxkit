import { Option } from "effect";
import * as Atom from "effect/reactivity/Atom";

export const docsHeadingId = "taxkit-docs-content";

// Intent belongs to the current registry and survives the source page unmount.
// Native Router consumes it after rendering the intended destination.
export const docsHeadingFocusAtom = Atom.make(Option.none<string>()).pipe(
  Atom.keepAlive
);
