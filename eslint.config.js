/**
 * ESLint (flat config) — catches bugs in plain JavaScript.
 * Server files run in Node; everything in /public runs in the browser.
 * Shared modules (public/js/shared, components, pages) run in BOTH, so they
 * may only use globals available in both environments.
 */
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'storage/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Browser-only code.
    files: ['public/js/client/**/*.js', 'public/admin/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
];
