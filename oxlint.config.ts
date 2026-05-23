import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";
import remix from "ultracite/oxlint/remix";

export default defineConfig({
  extends: [core, react, remix],
  ignorePatterns: [
    "apps/web/src/routeTree.gen.ts",
    "dist/**",
    ".output/**",
    ".tanstack/**",
    ".turbo/**",
    ".vercel/**",
  ],
  jsPlugins: [
    "./tools/oxlint/no-switch-plugin.js",
    "./tools/oxlint/whattax-rules.js",
  ],
  rules: {
    "func-name-matching": "off",
    "func-names": "off",
    "max-classes-per-file": "off",
    "no-restricted-properties": [
      "error",
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.entries.",
        object: "Object",
        property: "entries",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed builder instead of Object.fromEntries.",
        object: "Object",
        property: "fromEntries",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.keys.",
        object: "Object",
        property: "keys",
      },
      {
        message:
          "Use Effect primitives such as HashMap, HashSet, Record, Array, or a typed iterator instead of Object.values.",
        object: "Object",
        property: "values",
      },
    ],
    "typescript/consistent-type-assertions": [
      "error",
      {
        assertionStyle: "never",
      },
    ],
    "typescript/no-non-null-assertion": "error",
    "typescript/no-unnecessary-type-assertion": "error",
    "typescript/no-unsafe-type-assertion": "error",
    // Effect Array supports data-first calls like Array.filter(items, predicate);
    // this Unicorn rule misreads that second argument as a native Array thisArg.
    "unicorn/no-array-method-this-argument": "off",
    "whattax-no-switch/no-switch": "error",
    "whattax/no-manual-tag": "error",
  },
});
