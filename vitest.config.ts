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
        statements: 87,
        branches: 80,
        functions: 87,
        lines: 87,
        perFile: {
          statements: 87,
          lines: 87,
        },
      },
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/router.ts',
        'src/i18n/**',
        'src/types/**',
        'src/schemas/**',
        'src/utils/dice-roller/plugins/dice/ast.ts',
        'src/components/Tree/**',
        'src/components/common/milkdown/**',
        'src/components/common/MarkdownEditor.vue',
        'src/notes/NoteCanvas.vue',
        'src/probability-calculator/ProbabilitySyntaxView.vue',
        'src/modules/ModuleDocumentTree.vue',
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
