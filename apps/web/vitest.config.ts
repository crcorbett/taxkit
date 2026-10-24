import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    // Browser and native-pair tests have their own configurations.
    exclude: ["test/**/*.browser.test.tsx", "test/native-*.test.ts"],
    include: ["test/**/*.test.ts"],
  },
});
