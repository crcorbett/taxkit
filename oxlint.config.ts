import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react],
  ignorePatterns: ["**/routeTree.gen.ts"],
  options: {
    typeAware: true,
  },
  overrides: [
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-inline-comments": "off",
        "typescript/no-non-null-assertion": "off",
      },
    },
    {
      files: ["apps/web/src/routes/**/*.tsx"],
      rules: {
        "no-use-before-define": "off",
      },
    },
  ],
  rules: {
    "func-names": "off",
    "func-style": "off",
    "max-classes-per-file": "off",
    "oxc/no-barrel-file": "off",
    "sort-keys": "off",
    "unicorn/no-array-method-this-argument": "off",
  },
});
