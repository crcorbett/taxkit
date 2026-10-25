import { defineConfig } from "vitest/config";

// `node` without `module`: Takumi's WASM loader then reads its own asset
// instead of expecting a Vite client build.
const conditions = ["node", "development|production"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
  test: { include: ["test/**/*.test.ts"] },
});
