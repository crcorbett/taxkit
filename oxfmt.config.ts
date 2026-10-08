import { defineConfig } from "oxfmt";
import ultracite from "ultracite/oxfmt";

export default defineConfig({
  ...ultracite,
  ignorePatterns: [
    ...ultracite.ignorePatterns,
    ".agents/**",
    ".claude/**",
    "AGENTS.md",
    "README.md",
    "docs/**",
    "apps/web/src/routeTree.gen.ts",
    "apps/web/src/worker-runtime.generated.d.ts",
    "tools/oxlint/anti-slop/**",
  ],
  // Preserve authored Markdown wrapping. Ultracite 7.10 otherwise rewrites
  // current and historical documentation wholesale.
  proseWrap: "preserve",
});
