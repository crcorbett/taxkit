import {
  Match,
  Function as EffectFunction,
  Array as EffectArray,
  HashSet,
  MutableRef,
  Option,
  Ref,
} from "effect";

import { importSourceValue, propertyName } from "../binding-tracker.ts";
import type { OxlintRule, SyntaxKind } from "../host.types.js";

const importedName = (
  specifier: SyntaxKind<"ImportDeclaration">["specifiers"][number]
) =>
  Match.value(specifier).pipe(
    Match.when({ type: "ImportSpecifier" }, (matchedValue) =>
      propertyName(matchedValue.imported)
    ),
    Match.orElse(() => Option.none<string>())
  );
const localName = (
  specifier: SyntaxKind<"ImportDeclaration">["specifiers"][number]
) =>
  Match.value(specifier?.local).pipe(
    Match.when({ type: "Identifier" }, () => specifier.local.name),
    Match.orElse(() => null)
  );
const hasUnaliasedImport = (
  node: SyntaxKind<"ImportDeclaration">,
  names: HashSet.HashSet<string>
) =>
  EffectFunction.pipe(
    node.specifiers ?? [],
    EffectArray.some((specifier) => {
      const name = importedName(specifier);
      return (
        Option.isSome(name) &&
        HashSet.has(names, name.value) &&
        localName(specifier) === name.value
      );
    })
  );
const effectVitestSharedGlobals = HashSet.fromIterable([
  "describe",
  "expect",
  "it",
  "test",
]);
export const noEffectTestGlobalMix: OxlintRule = {
  create(context) {
    const imports = Ref.makeUnsafe<{
      readonly effectTestImport: Option.Option<SyntaxKind<"ImportDeclaration">>;
      readonly vitestGlobalImport: Option.Option<
        SyntaxKind<"ImportDeclaration">
      >;
    }>({
      effectTestImport: Option.none(),
      vitestGlobalImport: Option.none(),
    });
    return {
      ImportDeclaration(node) {
        const source = importSourceValue(node);
        if (
          source === "@effect/vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          MutableRef.update(imports.ref, (current) => ({
            ...current,
            effectTestImport: Option.some(node),
          }));
        }
        if (
          source === "vitest" &&
          hasUnaliasedImport(node, effectVitestSharedGlobals)
        ) {
          MutableRef.update(imports.ref, (current) => ({
            ...current,
            vitestGlobalImport: Option.some(node),
          }));
        }
      },
      "Program:exit"() {
        const { effectTestImport, vitestGlobalImport } = Ref.getUnsafe(imports);
        if (
          Option.isSome(effectTestImport) &&
          Option.isSome(vitestGlobalImport)
        ) {
          context.report({
            messageId: "noEffectTestGlobalMix",
            node: vitestGlobalImport.value,
          });
        }
      },
    };
  },
  meta: {
    docs: {
      description:
        "Disallow mixed unaliased Effect Vitest and Vitest test globals.",
    },
    messages: {
      noEffectTestGlobalMix:
        "Do not split unaliased describe, expect, it, or test imports between @effect/vitest and vitest. Import the shared test API from one module; Vitest-only utilities may still come from vitest, and an explicitly aliased secondary API is allowed.",
    },
    type: "problem",
  },
};
