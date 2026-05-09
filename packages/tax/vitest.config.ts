import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    include: ["test/**/*.test.ts"],
    passWithNoTests: true,
  },
});
