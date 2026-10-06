import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    include: [
      "test/native-pair.boundary.test.ts",
      "test/native-rate.boundary.test.ts",
      "test/native-rate-provider.boundary.test.ts",
      "test/native-rpc-failures.boundary.test.ts",
      "test/native-cancellation.boundary.test.ts",
      "test/native-settings-failure.boundary.test.ts",
      "test/native-local-development.boundary.test.ts",
    ],
    testTimeout: 30_000,
  },
});
