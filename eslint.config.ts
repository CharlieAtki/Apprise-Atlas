import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "fixtures/**", "schemas/**"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    rules: {
      // `any` is allowed only with an eslint-disable comment, which is itself the
      // justification AGENTS.md requires.
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-exports": ["error", { restrictDefaultExports: { direct: true } }],
      // Destructuring to omit a field is a legitimate idiom and should not require
      // renaming the omitted binding to keep the linter quiet.
      "@typescript-eslint/no-unused-vars": ["error", { ignoreRestSiblings: true }],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },

  {
    // The single mechanical guard against a second definition of a domain shape.
    // A schema file declares shapes as Zod schemas; the TypeScript type is derived
    // from the schema, never written alongside it. See AGENTS.md.
    //
    // Ports (`core/src/ports/`) are behavioural contracts, not data shapes, and are
    // exempt by construction because this block only matches `*.schema.ts`.
    files: ["packages/*/src/**/*.schema.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "TSInterfaceDeclaration",
          message:
            "Schema files declare shapes as Zod schemas. Export a Zod schema and derive the type with z.output<typeof Schema>.",
        },
        {
          selector:
            "TSTypeAliasDeclaration:not(:has(TSTypeReference > TSQualifiedName[right.name=/^(output|input|infer)$/]))",
          message:
            "A type in a schema file must be derived from its schema: export type X = z.output<typeof XSchema>.",
        },
      ],
    },
  },

  {
    files: ["**/*.test.ts"],
    rules: {
      // Tests construct deliberately malformed values to prove they are rejected.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  {
    // Tool configs are loaded by their tool, which expects a default export.
    files: ["**/*.config.{ts,mts,mjs,cjs,js}", "**/.*.{mjs,cjs,js}"],
    rules: {
      "no-restricted-exports": "off",
    },
  },

  {
    // dependency-cruiser's config is CommonJS by necessity — it is the format the
    // tool loads.
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
  },

  {
    // Toolchain scripts run on Node and are allowed to say so. Nothing in packages/
    // gets these globals.
    files: ["scripts/**/*.{mjs,js,ts}"],
    languageOptions: {
      globals: globals.node,
    },
  },
);
