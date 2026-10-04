import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  test: {
    // These are source inputs for the actual CLI fixtures, not test suites.
    exclude: ["tools/oxlint/fixtures/**"],
    fileParallelism: false,
    include: ["tools/**/*.test.ts"],
    passWithNoTests: false,
    pool: "forks",
  },
});
