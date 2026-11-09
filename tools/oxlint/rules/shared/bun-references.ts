import { Option } from "effect";

import type { ImportSemantic } from "../../host.types.js";

export const bunImportSemantic: ImportSemantic = (source, kind, imported) => {
  if (source === "@effect/platform-bun") {
    if (kind === "ImportNamespaceSpecifier") {
      return Option.some("platform-bun");
    }
    if (kind === "ImportSpecifier") {
      return imported.pipe(Option.filter((name) => name === "BunRuntime"));
    }
  }
  if (source === "@effect/platform-bun/BunRuntime") {
    if (kind === "ImportSpecifier" && Option.isSome(imported)) {
      return Option.some(`BunRuntime.${imported.value}`);
    }
    return Option.some("BunRuntime");
  }
  return Option.none();
};
