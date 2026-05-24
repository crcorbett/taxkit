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
  overrides: [
    {
      files: ["packages/calculators/src/**/*.ts"],
      rules: {
        "whattax/no-ambient-time-or-random": "error",
        "whattax/no-async-await-promise": "error",
        "whattax/no-conditional-object-spread": "error",
        "whattax/no-context-nullish-default": "error",
        "whattax/no-in-operator": "error",
        "whattax/no-instanceof": "error",
        "whattax/no-json-parse-stringify": "error",
        "whattax/no-native-array-methods": "error",
        "whattax/no-native-collections": "error",
        "whattax/no-nested-wrapper-calls": "error",
        "whattax/no-nullish-comparison": "error",
        "whattax/no-throw": "error",
        "whattax/no-typeof": "error",
        "whattax/no-undefined-comparison": "error",
      },
    },
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
    "whattax/no-layer-exports-in-service-files": "error",
    "whattax/no-manual-tag": "error",
    "whattax/no-runtime-execution-outside-boundaries": "error",
  },
});
