import { defineWorkspace } from 'vitest/config';

const contractsSource = new URL('./packages/contracts/src/index.ts', import.meta.url).pathname;
const fixturesSource = new URL('./packages/fixtures/src/index.ts', import.meta.url).pathname;

export default defineWorkspace([
  {
    resolve: {
      alias: {
        '@patentdraw/contracts': contractsSource,
        '@patentdraw/fixtures': fixturesSource,
      },
    },
    test: {
      include: ['tests/**/*.test.ts', 'apps/**/*.test.{ts,tsx}', 'packages/**/*.test.ts'],
    },
  },
]);
