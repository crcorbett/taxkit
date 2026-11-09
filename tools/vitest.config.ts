import { defineConfig } from "vitest/config";

// `node` without `module`: Takumi's WASM loader in the imported API Worker then
// reads its own asset instead of expecting a Vite client build.
const conditions = ["node", "development|production"];

export default defineConfig({
  test: {
    passWithNoTests: false,
    projects: [
      {
        resolve: { conditions },
        ssr: { resolve: { conditions } },
        test: {
          // These are source inputs for the actual CLI fixtures, not test suites.
          exclude: ["tools/oxlint/fixtures/**", "tools/apps-local/test/**"],
          fileParallelism: false,
          include: ["tools/**/*.test.ts"],
          name: "tools",
          pool: "forks",
        },
      },
      {
        test: {
          // The built Website/API pair from `build:native-pair`, run under Node
          // in Miniflare and Chromium. Suites share fixed loopback ports.
          fileParallelism: false,
          include: ["tools/apps-local/test/**/*.test.ts"],
          name: "native-pair",
          testTimeout: 30_000,
        },
      },
    ],
  },
});
