module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
    project: "./tsconfig.json"
  },
  plugins: [
    "@typescript-eslint",
    "react",
    "react-hooks",
    "import",
    "tailwindcss"
  ],
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:import/recommended",
    "plugin:import/typescript",
    "plugin:tailwindcss/recommended",
    "prettier" // Disable ESLint rules that conflict with Prettier
  ],
  settings: {
    react: { version: "detect" },
    "import/resolver": {
      typescript: { alwaysTryTypes: true, project: "./tsconfig.json" }
    }
  },
  rules: {
    // Custom rules can go here
    "@typescript-eslint/no-unused-vars": "error",
    "react/react-in-jsx-scope": "off", // Not needed with React 17+
    "import/order": [
      "error",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index"
        ],
        "newlines-between": "always"
      }
    ]
  },
  ignorePatterns: [
    "dist/",
    "build/",
    "node_modules/",
    "*.config.js",
    "vite.config.ts"
  ]
}
