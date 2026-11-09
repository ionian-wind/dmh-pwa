/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import path from 'node:path';
import { createFeaturePlugin } from './scripts/feature-flags-plugin.mjs';
import {
  featureDefines,
  resolveFeatureFlags,
} from './scripts/feature-catalog.mjs';

const featureFlags = resolveFeatureFlags({});

export default defineConfig({
  plugins: [createFeaturePlugin(featureFlags), vue()],
  define: featureDefines(featureFlags),
  test: {
    printConsoleTrace: true,
    disableConsoleIntercept: true,
    environment: 'jsdom',
    // Reuse one jsdom environment per worker instead of creating one per file.
    pool: 'vmThreads',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        statements: 87,
        branches: 87,
        functions: 87,
        lines: 87,
      },
      exclude: [
        'src/main.ts',
        'src/App.vue',
        'src/router.ts',
        'src/i18n/**',
        'src/types/**',
        'src/schemas/**',
        'src/components/Tree/**',
        'src/components/common/milkdown/**',
        'src/components/common/MarkdownEditor.vue',
        'src/notes/NoteCanvas.vue',
        'src/probability-calculator/ProbabilitySyntaxView.vue',
        'src/modules/ModuleDocumentTree.vue',
        'src/components/common/MonacoEditor.vue',
        'src/components/common/monaco.ts',
        'src/ambient-sound/components/SceneLinksPanel.vue',
        'src/utils/dice-probability-calculator/tokens.ts',
        'src/notes/NoteViewSidebar.vue',
        'src/components/common/entityLinking/useMapEntityCatalog.ts',
        'src/features/**',
        'src/composables/useFeatureStores.ts',
        'src/utils/files/BlobFileHandler.ts',
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
