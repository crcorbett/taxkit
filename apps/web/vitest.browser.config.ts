import react from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  optimizeDeps: {
    // Workspace source can change without a lockfile change. Each run must
    // compile that source again.
    force: true,
    include: [
      "@tanstack/react-router",
      "effect/Function",
      "effect/http-api",
      "effect/http/HttpClient",
      "effect/http/HttpClientResponse",
    ],
  },
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser: "chromium" }],
      provider: playwright(),
    },
    include: ["test/**/*.browser.test.tsx"],
    passWithNoTests: false,
  },
});
