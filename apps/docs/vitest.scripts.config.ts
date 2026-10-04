import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { conditions: ["source", ...defaultServerConditions] },
  ssr: { resolve: { conditions: ["source", ...defaultServerConditions] } },
  test: {
    include: [
      "scripts/cloudflare-built-proof.live.layer.test.ts",
      "scripts/cloudflare-built-proof.boundary.test.ts",
      "scripts/cloudflare-built-browser.live.test.ts",
      "scripts/check-import-boundaries.runtime.test.ts",
      "scripts/cloudflare-hosted-proof.boundary.test.ts",
      "scripts/cloudflare-hosted-proof.live.layer.test.ts",
      "scripts/test-cloudflare-hosted.propagation.test.ts",
    ],
  },
});
