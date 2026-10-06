import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  test: { environment: "node", globals: false, include: ["test/**/*.test.ts"] },
});
