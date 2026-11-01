import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { config } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { vi, beforeEach, beforeAll } from 'vitest';
import { exposeConsole, debug } from '../src/utils/debug';
import { resetStoreCache } from '../src/utils/storage';
import en from '../src/i18n/locales/en.json';
import ru from '../src/i18n/locales/ru.json';
import { quasarStubs } from './helpers/quasar-stubs';
import { createLayoutStore, LayoutKey } from '../src/composables/useLayout';

vi.mock('quasar', () => {
  const chainable = () => {
    const api: any = {
      onOk: () => api,
      onCancel: () => api,
      onDismiss: () => api,
      hide: () => api,
    };
    return api;
  };
  return {
    Dialog: { create: vi.fn(chainable) },
    Notify: { create: vi.fn() },
    QVirtualScroll: {},
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
  });

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

// Mock crypto.randomUUID
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  },
});

// Keep console output for debugging failures while still allowing spies.
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
});

// Every component test gets Pinia, i18n, and Quasar stubs unless it overrides them.
config.global.plugins = [createPinia(), i18n] as any;
config.global.stubs = { ...quasarStubs };
config.global.directives = { ripple: {} };

beforeAll(async () => {
  await exposeConsole();
});

// Reset mocks before each test
beforeEach(async () => {
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  const pinia = createPinia();
  setActivePinia(pinia);
  config.global.plugins = [pinia, i18n] as any;
  config.global.stubs = { ...quasarStubs };
  config.global.directives = { ripple: {} };
  config.global.provide = { [LayoutKey]: createLayoutStore() } as any;
});
