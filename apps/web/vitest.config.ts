import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    exclude: ["src/**/*.browser.test.tsx"],
    include: ["src/**/*.test.ts"],
  },
});
