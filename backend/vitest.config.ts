import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    passWithNoTests: true,
    env: {
      DATABASE_PATH: ':memory:',
      NODE_ENV: 'test',
    },
  },
});
