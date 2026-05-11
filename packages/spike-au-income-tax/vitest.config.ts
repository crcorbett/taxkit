import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["source", "node"],
  },
  ssr: {
    resolve: {
      conditions: ["source", "node"],
    },
  },
  test: {
    include: ["test/**/*.test.ts"],
    server: {
      deps: {
        inline: [/^@whattax\//],
      },
    },
  },
});
