import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import vue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...vue.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { parser: tsParser, extraFileExtensions: ['.vue'] },
    },
    plugins: { '@typescript-eslint': tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-return-assign': 'off',
      'comma-dangle': ['warn', 'always-multiline'],
      '@typescript-eslint/no-unused-vars': 'off',
      'vue/no-mutating-props': 'off',
      // Preserve the existing public component names while checking new components.
      'vue/multi-word-component-names': ['error', { ignores: ['Header', 'Homepage', 'Sidebar'] }],
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { parser: tsParser },
  },
  {
    files: ['src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]
