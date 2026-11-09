import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Browser tests have their own configuration.
    exclude: ["test/**/*.browser.test.tsx"],
    include: ["test/**/*.test.ts"],
  },
});
