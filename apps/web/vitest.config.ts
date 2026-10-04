import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { __TAXKIT_WEB_CLIENT_INPUT__: "{}" },
  resolve: { conditions: ["source", ...defaultServerConditions] },
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    exclude: ["src/**/*.browser.test.tsx"],
    include: ["src/**/*.test.ts"],
  },
});
