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
        statements: 82,
        branches: 69,
        functions: 84,
        lines: 83,
      },
      exclude: [
        'src/main.ts',
        'src/router.ts',
        'src/i18n/**',
        'src/types/**',
        'src/schemas/**',
        'tests/**',
        'dist/**',
        'dev-dist/**',
        'scripts/**',
        'coverage/**',
        '**/sw.js',
        '**/*.d.ts',
        '**/*.config.*',
      ],
    },
  },
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, './src') },
      {
        find: /^\/dmh-pwa\/(.*)/,
        replacement: path.resolve(import.meta.dirname, './public/$1'),
      },
    ],
  },
});
