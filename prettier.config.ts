import type { Config } from "prettier";

const config: Config = {
  printWidth: 100,
  singleQuote: false,
  semi: true,
  trailingComma: "all",
  arrowParens: "always",
  overrides: [
    {
      // Authored Markdown is wrapped by hand so diffs stay line-oriented.
      files: "*.md",
      options: { proseWrap: "preserve" },
    },
  ],
};

export default config;
