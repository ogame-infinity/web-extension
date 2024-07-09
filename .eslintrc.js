module.exports = {
  env: {
    browser: true,
    es2020: true,
  },
  extends: ["eslint:recommended", "prettier"],
  plugins: ["prettier"],
  overrides: [
    {
      files: ["src/**/*.js"],
      excludedFiles: "src/libs/**",
    },
  ],
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  rules: {
    "prettier/prettier": ["error"],
    "no-undef": 0,
    "no-unused-vars": 0,
    "no-async-promise-executor": 0,
    "no-empty": 0,
    "no-inner-declarations": 0,
    "no-global-assign": 0,
    "no-prototype-builtins": 0,
    indent: ["error", 2],
    "linebreak-style": ["error", "unix"],
    quotes: ["error", "double", { avoidEscape: true }],
    semi: ["error", "always"],
  },
};
