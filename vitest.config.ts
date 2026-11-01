/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';

export default defineConfig({
  plugins: [vue()],
  test: {
    printConsoleTrace: true,
    disableConsoleIntercept: true,
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 65,
        lines: 80,
      },
      exclude: [
        'src/main.ts',
        'src/router.ts',
        'src/i18n/**',
        'src/types/**',
        'src/schemas/**',
        'tests/**',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(__dirname, './src') },
      {
        find: /^\/dmh-pwa\/(.*)/,
        replacement: path.resolve(__dirname, './public/$1'),
      },
    ],
  },
});
