"use strict";

/** @type {import('eslint').Linter.Config} */
module.exports = {
    root: true,
    extends: [
        "@pentible/eslint-config",
        "@pentible/eslint-config-node",
        "@pentible/eslint-config-prettier",
    ],
    rules: {
        "no-constant-condition": ["error", { checkLoops: false }],
    },
};
