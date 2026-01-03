import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import globals from "globals";

export default [
    js.configs.recommended,
    prettierConfig,
    {
        plugins: {
            prettier: prettierPlugin
        },
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.browser
            }
        },
        rules: {
            "prettier/prettier": "error",
            "no-unused-vars": "warn",
            "no-console": ["warn", { allow: ["warn", "error"] }]
        }
    }
];
