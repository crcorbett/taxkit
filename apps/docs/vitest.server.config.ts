import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source", ...defaultServerConditions],
    tsconfigPaths: true,
  },
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/.tanstack/**"],
    globals: false,
    include: ["src/**/*.server.test.ts", "src/lib/docs/route-boundary.test.ts"],
    passWithNoTests: false,
  },
});
