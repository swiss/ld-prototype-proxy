import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {
    ignores: ["node_modules/**", "public/**"],
  },
  {
    languageOptions: { globals: globals.node }
  },
  pluginJs.configs.recommended,
];