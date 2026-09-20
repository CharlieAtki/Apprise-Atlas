import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Each package owns its own vitest config; the root one only collects them so
    // `xc test` runs the whole workspace with a single reporter.
    projects: ["packages/*"],
    restoreMocks: true,
    include: ["src/**/*.test.ts"],
    // *.spec.ts is reserved for Playwright and must never be picked up here.
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.spec.ts"],
  },
});
