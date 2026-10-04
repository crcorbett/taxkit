import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["test/native-pair.boundary.test.ts"], testTimeout: 30_000 },
});
