module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*",
    ".eslintrc.js",
    "**/*.js",
  ],
  plugins: [
    "@typescript-eslint",
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "max-len": "off",
    "require-jsdoc": "off",
    "indent": "off",
    "no-trailing-spaces": "off",
    "eol-last": "off",
  },
};