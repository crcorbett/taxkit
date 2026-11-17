import { defineConfig } from "vitest/config";

// Each package owns its module cache: Turbo runs package tests in parallel
// processes, and a shared root cache races when it is cleared.
export default defineConfig({
  // `node` without `module`: Takumi's WASM loader then reads its own asset
  // instead of expecting a Vite client build.
  resolve: { conditions: ["node"] },
  ssr: { resolve: { conditions: ["node"] } },
  test: {
    fsModuleCachePath: "node_modules/.vitest-cache",
    include: ["test/**/*.test.ts"],
  },
});
