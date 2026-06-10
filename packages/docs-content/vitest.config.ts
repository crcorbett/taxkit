import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
