import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Browser and native-pair tests have their own configurations.
    exclude: ["test/**/*.browser.test.tsx", "test/native-*.test.ts"],
    include: ["test/**/*.test.ts"],
  },
});
