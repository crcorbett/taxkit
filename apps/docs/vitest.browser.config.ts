import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source"],
    tsconfigPaths: true,
  },
  ssr: {
    resolve: {
      conditions: ["source"],
    },
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    exclude: ["**/node_modules/**", "**/.tanstack/**"],
    globals: false,
    include: ["src/**/*.browser.test.ts", "src/**/*.browser.test.tsx"],
    passWithNoTests: false,
  },
});
