import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["@packages/source"],
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "**/.output/**"],
    globals: false,
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    passWithNoTests: true,
  },
});
