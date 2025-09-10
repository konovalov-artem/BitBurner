import eslintPluginPrettier from 'eslint-plugin-prettier'
import eslintConfigPrettier from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import eslint from '@eslint/js'

export default defineConfig([
  tseslint.config(eslint.configs.recommended, tseslint.configs.recommended),
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    rules: {
      'prettier/prettier': 'error',
      'max-len': ['error', { code: 120 }],
    },
  },
  eslintConfigPrettier,
])
