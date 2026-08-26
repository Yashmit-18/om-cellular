import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // Disable the new React 19 rule that flags setState inside useEffect.
      // The standard data-fetching pattern (useCallback + useEffect) used throughout
      // this codebase is valid. This rule is overly strict for this pattern.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
