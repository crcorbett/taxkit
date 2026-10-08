import mdx from "fumadocs-mdx/vite";
import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

import * as sourceConfig from "./source.config.js";

export default defineConfig({
  plugins: [
    mdx(sourceConfig, { configPath: "source.config.ts", outDir: ".source" }),
  ],
  resolve: { conditions: ["source", ...defaultServerConditions] },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**"],
    globals: false,
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
    testTimeout: 10_000,
  },
});
