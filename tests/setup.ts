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
  const useDialogPluginComponent = Object.assign(
    () => ({
      dialogRef: { value: null },
      onDialogHide: vi.fn(),
      onDialogOK: vi.fn(),
      onDialogCancel: vi.fn(),
    }),
    { emits: ['ok', 'hide'] },
  );
  return {
    Dialog: { create: vi.fn(chainable) },
    Notify: { create: vi.fn() },
    QVirtualScroll: {},
    useDialogPluginComponent,
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

// Keep the real Web Crypto API (nanoid needs getRandomValues) and only
// override randomUUID for stable test identifiers.
if (globalThis.crypto) {
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    configurable: true,
    value: () => 'test-uuid-' + Math.random().toString(36).slice(2, 11),
  });
}

// Keep console output for debugging failures while still allowing spies.
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Global test utilities
globalThis.ResizeObserver = class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
} as any;

const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, ru },
});

// Every component test gets Pinia, i18n, and Quasar stubs unless it overrides them.
config.global.plugins = [createPinia(), i18n] as any;
config.global.stubs = { ...quasarStubs, teleport: true };
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
  await resetStoreCache();
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase('dmh-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
  const pinia = createPinia();
  setActivePinia(pinia);
  config.global.plugins = [pinia, i18n] as any;
  config.global.stubs = { ...quasarStubs, teleport: true };
  config.global.directives = { ripple: {} };
  config.global.provide = { [LayoutKey]: createLayoutStore() } as any;
});
