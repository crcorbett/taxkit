import { defineConfig } from "vitest/config";

// Each package owns its module cache: Turbo runs package tests in parallel
// processes, and a shared root cache races when it is cleared.
export default defineConfig({
  test: {
    fsModuleCachePath: "node_modules/.vitest-cache",
    // Browser tests have their own configuration.
    exclude: ["test/**/*.browser.test.tsx"],
    include: ["test/**/*.test.ts"],
  },
});
