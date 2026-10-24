import { defineConfig } from "vitest/config";

// `node` without `module`: Takumi's WASM loader in the imported API Worker then
// reads its own asset instead of expecting a Vite client build.
const conditions = ["source", "node", "development|production"];

export default defineConfig({
  resolve: { conditions },
  // Vite's server loader resolves workspace exports separately from browser resolution.
  // Fresh tool tests need the source export before any package build exists.
  ssr: { resolve: { conditions } },
  test: {
    // These are source inputs for the actual CLI fixtures, not test suites.
    exclude: ["tools/oxlint/fixtures/**"],
    fileParallelism: false,
    include: ["tools/**/*.test.ts"],
    passWithNoTests: false,
    pool: "forks",
  },
});
