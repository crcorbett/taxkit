import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  test: { fileParallelism: false, include: ["test/**/*.test.ts"] },
});
