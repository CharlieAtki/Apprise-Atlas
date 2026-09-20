import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "provider-markdown",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
