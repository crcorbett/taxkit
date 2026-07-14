import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
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
    exclude: ["**/node_modules/**", "**/.output/**", "**/.tanstack/**"],
    globals: false,
    include: ["src/**/*.browser.test.ts", "src/**/*.browser.test.tsx"],
    passWithNoTests: false,
  },
});
