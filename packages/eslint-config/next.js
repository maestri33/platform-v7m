import baseConfig from "./base.js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...baseConfig,
  {
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    }
  }
];
