import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "node_modules/.vite",
  test: {
    include: ["test/**/*.test.ts"],
  },
});
