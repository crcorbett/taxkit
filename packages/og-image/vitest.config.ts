import { defineConfig } from "vitest/config";

export default defineConfig({
  // `node` without `module`: Takumi's WASM loader then reads its own asset
  // instead of expecting a Vite client build.
  resolve: { conditions: ["node"] },
  ssr: { resolve: { conditions: ["node"] } },
  test: {
    include: ["test/**/*.test.ts"],
  },
});
