import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/test-utils.ts', 'src/types.ts', 'src/index.ts'],
      thresholds: { branches: 95, lines: 95, functions: 95, statements: 95 },
    },
  },
});
