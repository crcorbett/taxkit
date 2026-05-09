import { defineConfig } from "oxlint";
import core from "ultracite/oxlint/core";
import react from "ultracite/oxlint/react";

export default defineConfig({
  ...core,
  ...react,
  ignorePatterns: [".context/**"],
  rules: {
    ...core.rules,
    ...react.rules,
    "func-style": "off",
    "no-use-before-define": "off",
    "sort-keys": "off",
    "typescript/no-unsafe-type-assertion": "error",
  },
});
