import type { Appearance } from "@taxkit/mdx-react/schemas";
import * as Atom from "effect/reactivity/Atom";

// A tab-local choice survives route changes in the existing root registry.
// Reloads and JavaScript-disabled readers use the device preference.
export const docsAppearanceAtom = Atom.make<Appearance>("system").pipe(
  Atom.keepAlive
);
