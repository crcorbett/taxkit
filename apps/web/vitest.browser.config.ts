import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defaultClientConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  define: { __TAXKIT_WEB_CLIENT_INPUT__: "{}" },
  optimizeDeps: {
    include: [
      "@tanstack/react-router",
      "@taxkit/api-http/client/live",
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
