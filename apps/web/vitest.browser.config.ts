import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    conditions: ["source", ...defaultClientConditions],
    tsconfigPaths: true,
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["src/**/*.browser.test.tsx"],
    passWithNoTests: false,
  },
});
