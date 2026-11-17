import { defineConfig } from "vitest/config";

// Each package owns its module cache: Turbo runs package tests in parallel
// processes, and a shared root cache races when it is cleared.
export default defineConfig({
  test: {
    fsModuleCachePath: "node_modules/.vitest-cache",
    include: ["test/**/*.test.ts"],
  },
});
