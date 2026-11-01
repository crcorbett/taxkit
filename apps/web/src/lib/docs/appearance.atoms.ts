import { Schema } from "effect";
import * as Atom from "effect/reactivity/Atom";

const DocsAppearanceMode = Schema.Literals(["system", "light", "dark"]);
// A tab-local choice survives route changes in the existing root registry.
// Reloads and JavaScript-disabled readers use the device preference.
export const docsAppearanceAtom = Atom.make<typeof DocsAppearanceMode.Type>(
  "system"
).pipe(Atom.keepAlive);
