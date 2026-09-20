import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "provider-likec4",
    include: ["src/**/*.test.ts"],
    restoreMocks: true,
  },
});
