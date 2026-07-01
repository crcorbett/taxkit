import mdx from "fumadocs-mdx/vite";
import { defineConfig } from "vitest/config";

import * as sourceConfig from "./source.config";

export default defineConfig(async () => ({
  plugins: [
    await mdx(sourceConfig, {
      configPath: "source.config.ts",
      outDir: ".source",
    }),
  ],
  resolve: {
    conditions: ["source"],
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    testTimeout: 10_000,
  },
}));
