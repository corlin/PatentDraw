import { defineConfig } from 'vitest/config';

const contractsSource = new URL('./packages/contracts/src/index.ts', import.meta.url).pathname;
const fixturesSource = new URL('./packages/fixtures/src/index.ts', import.meta.url).pathname;

export default defineConfig({
  resolve: {
    alias: {
      '@patentdraw/contracts': contractsSource,
      '@patentdraw/fixtures': fixturesSource,
    },
  },
  test: {
    include: ['tests/**/*.test.ts', 'apps/**/*.test.{ts,tsx}', 'packages/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'apps/api/src/modules/ai-assistance/**/*.ts',
        'apps/api/src/modules/projects-assets/**/*.ts',
        'apps/api/src/modules/svg-review-export/**/*.ts',
        'apps/web/src/features/ai-figure-plan/**/*.{ts,tsx}',
        'apps/web/src/features/svg-review-export/**/*.{ts,tsx}',
      ],
      exclude: ['**/*.test.{ts,tsx}', '**/migrations/**'],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 55,
      },
    },
  },
});
