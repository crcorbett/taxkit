import { HashMap, HashSet, Option } from "effect";

import type { ImportSemantic } from "../../host.types.js";

const effectModules = HashSet.fromIterable(["Effect"]);
export const effectImportSemantic: ImportSemantic = (
  source,
  kind,
  imported
) => {
  if (source === "effect") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("effect");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(
        Option.filter((name) => HashSet.has(effectModules, name))
      );
    }
  }
  return HashMap.get(HashMap.make(["effect/Effect", "Effect"]), source).pipe(
    Option.map((module) => {
      if (kind === "ImportSpecifier" && Option.isSome(imported)) {
        return `${module}.${imported.value}`;
      }
      return module;
    })
  );
};
