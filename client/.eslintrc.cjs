/* eslint-env node */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:react/jsx-runtime",
    "plugin:react-hooks/recommended",
  ],
  ignorePatterns: ["dist", ".eslintrc.cjs"],
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  settings: { react: { version: "18.2" } },
  plugins: ["react-refresh"],
  rules: {
    "react/no-unknown-property": [
      "warn",
      {
        ignore: [
          "attach",
          "args",
          "intensity",
          "position",
          "angle",
          "penumbra",
          "castShadow",
          "shadow-bias",
          "dispose",
          "rotation",
          "geometry",
          "material",
          "morphTargetDictionary",
          "morphTargetInfluences",
          "visible",
          "skeleton",
          "object",
        ],
      },
    ],
    "react/prop-types": "off",
    "no-unused-vars": "warn",
    "react/jsx-no-target-blank": "off",
    "react-refresh/only-export-components": [
      "warn",
      { allowConstantExport: true },
    ],
    // Convert all errors to warnings
    "no-undef": "warn",
    "no-case-declarations": "warn",
    "react/no-unescaped-entities": "warn",
    "react-hooks/exhaustive-deps": "warn",
    // Removed the invalid 'parsing-error' rule
  },
};
