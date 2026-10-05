import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "test/native-pair.boundary.test.ts",
      "test/native-rpc-failures.boundary.test.ts",
      "test/native-settings-failure.boundary.test.ts",
    ],
    testTimeout: 30_000,
  },
});
