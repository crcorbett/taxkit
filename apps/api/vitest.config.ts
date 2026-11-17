import { defineConfig } from "vitest/config";

// `node` without `module`: Takumi's WASM loader then reads its own asset
// instead of expecting a Vite client build.
const conditions = ["node", "development|production"];

// Each package owns its module cache: Turbo runs package tests in parallel
// processes, and a shared root cache races when it is cleared.
export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: {
    fsModuleCachePath: "node_modules/.vitest-cache",
    include: ["test/**/*.test.ts"],
  },
});
