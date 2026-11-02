import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["test/**/*.browser.test.tsx"],
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
