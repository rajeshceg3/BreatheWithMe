const globals = require("globals");
const js = require("@eslint/js");

module.exports = [
    js.configs.recommended,
    {
        files: ["js/**/*.js"],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: "module",
            globals: {
                ...globals.browser,
                // Add global classes defined in other files
                AudioManager: "readonly",
                ThemeManager: "readonly",
                ParticleManager: "readonly",
                UIMediator: "readonly",
                AnimationManager: "readonly",
                RegimentManager: "readonly",
                AnalyticsManager: "readonly",
                SessionManager: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error"
        }
    },
    {
        // Test environment
        files: ["tests/**/*.js"],
        languageOptions: {
            globals: {
                ...globals.jest,
                ...globals.node
            }
        }
    }
];
