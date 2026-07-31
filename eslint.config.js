import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '.gstack/**',
      'prettier.config.cjs',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
