// eslint-disable-next-line no-undef
module.exports = {
  root: true,
  env: {
    es6: true,
    node: true, // Ensure Node.js environment is enabled
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*",
    "dist/**/*"
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "@typescript-eslint/no-require-imports": "off",
    "no-cond-assign": "off",
    "quotes": ["error", "double"],
    "import/no-unresolved": 0,
    "indent": ["error", 2],
    "no-undef": "off", // Turn off no-undef rule to prevent module errors
  },
};
