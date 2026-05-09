import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.context/**",
      "**/.output/**",
    ],
    globals: false,
    include: ["**/*.test.ts", "**/*.test.tsx"],
    passWithNoTests: true,
    projects: ["packages/*", "apps/*"],
  },
});
