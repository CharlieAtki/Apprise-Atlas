/**
 * Mechanical enforcement of the seams in AGENTS.md.
 *
 * These rules are the whole of the decoupling guarantee. A rule that has never been
 * seen to fail is a rule that does not exist, so each one below was broken on purpose
 * once and observed to fire before being committed.
 */

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-node-builtins-in-core",
      comment:
        "core is a set of rules about shapes. If a function could fail because of something " +
        "outside the process, it belongs in toolkit.",
      severity: "error",
      from: { path: "^packages/core/src" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "core-depends-on-zod-only",
      comment: "core's only permitted runtime dependency is zod.",
      severity: "error",
      from: { path: "^packages/core/src" },
      to: {
        dependencyTypes: ["npm", "npm-dev", "npm-optional", "npm-peer"],
        // Matches both the flat layout and Bun's isolated one
        // (node_modules/.bun/zod@x.y.z/node_modules/zod/).
        pathNot: ["node_modules/zod/"],
      },
    },
    {
      name: "providers-import-only-core",
      comment:
        "A provider depends on core alone, so a third party can write one without " +
        "taking the application layer with it.",
      severity: "error",
      from: { path: "^packages/provider-[^/]+/src" },
      to: { path: "^packages/(toolkit|cli)/" },
    },
    {
      name: "no-cross-provider-imports",
      comment: "Providers never import each other.",
      severity: "error",
      from: { path: "^packages/provider-([^/]+)/src" },
      to: { path: "^packages/provider-(?!$1)[^/]+/" },
    },
    {
      name: "nothing-imports-the-cli",
      comment: "The CLI is delivery. Nothing may depend on it.",
      severity: "error",
      from: { pathNot: "^packages/cli/" },
      to: { path: "^packages/cli/" },
    },
    {
      name: "toolkit-io-is-quarantined",
      comment:
        "toolkit is the application layer plus Atlas's own local I/O adapters. Only " +
        "src/adapters/ may touch node builtins.",
      severity: "error",
      from: { path: "^packages/toolkit/src", pathNot: "^packages/toolkit/src/adapters/" },
      to: { dependencyTypes: ["core"] },
    },
    {
      name: "no-deep-package-imports",
      comment:
        "Every package has one public entry. @apprise/atlas-toolkit/testing is the only " +
        "declared secondary entry. Reaching into another package's internals couples you " +
        "to code it never promised to keep.",
      severity: "error",
      // $1 is the source package name, so this matches only imports that cross a
      // package boundary — relative imports inside a package are untouched.
      from: { path: "^packages/([^/]+)/" },
      to: {
        path: "^packages/(?!$1/)[^/]+/src/.+",
        pathNot: "^packages/[^/]+/src/(index|testing)\\.ts$",
      },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      comment: "An unreferenced module is either dead or missing from an entry point.",
      severity: "warn",
      from: { orphan: true, pathNot: ["\\.d\\.ts$", "(^|/)\\.[^/]+\\.(js|cjs|mjs|ts)$"] },
      to: {},
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(\\.test\\.ts$|/dist/|^fixtures/)" },
    tsConfig: { fileName: "tsconfig.base.json" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "types", "default"],
      mainFields: ["module", "main", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
