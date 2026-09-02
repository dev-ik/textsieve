import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/test/**/*.test.ts", "tests/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["packages/*/src/**/*.ts"],
      exclude: ["packages/core/src/types.ts"],
      reporter: ["text", "json", "html"],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 80,
        lines: 90
      }
    }
  }
});
