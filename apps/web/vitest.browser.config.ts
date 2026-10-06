import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    // The explicitly bundled workspace RPC source can change without a lockfile
    // change. Each qualification must compile that source again.
    force: true,
    include: [
      "@tanstack/react-router",
      "@taxkit/api-rpc/live",
      "effect/Function",
      "effect/http-api",
      "effect/http/HttpClient",
      "effect/http/HttpClientResponse",
    ],
  },
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
