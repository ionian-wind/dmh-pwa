import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

async function loadTheme(matches = false) {
  vi.resetModules();
  const listeners: Array<(event: { matches: boolean }) => void> = [];
  const matchMedia = vi.fn().mockReturnValue({
    matches,
    media: '(prefers-color-scheme: dark)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(
      (_event: string, listener: (event: { matches: boolean }) => void) => {
        listeners.push(listener);
      },
    ),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  });
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });

  setActivePinia(createPinia());
  const { useConfigStore } = await import('@/utils/configStore');
  const { useUiTheme } = await import('@/composables/useUiTheme');
  const config = useConfigStore();
  const theme = useUiTheme();
  return { config, theme, listeners, matchMedia };
}

describe('useUiTheme', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves explicit light and dark modes', async () => {
    const { config, theme } = await loadTheme();

    config.uiTheme = 'light';
    await nextTick();
    expect(theme.isDark.value).toBe(false);

    config.uiTheme = 'dark';
    await nextTick();
    expect(theme.isDark.value).toBe(true);
    expect(theme.uiTheme.value).toBe('dark');
  });

  it('follows the system preference in auto mode', async () => {
    const { config, theme } = await loadTheme(false);

    config.uiTheme = 'auto';
    await nextTick();
    expect(theme.isDark.value).toBe(false);

    vi.resetModules();
    const dark = await loadTheme(true);
    dark.config.uiTheme = 'auto';
    await nextTick();
    expect(dark.theme.isDark.value).toBe(true);
  });

  it('reacts to system theme changes in auto mode', async () => {
    const { config, theme, listeners } = await loadTheme(false);
    config.uiTheme = 'auto';
    await nextTick();
    expect(theme.isDark.value).toBe(false);

    listeners.forEach((listener) => listener({ matches: true }));
    await nextTick();
    expect(theme.isDark.value).toBe(true);
  });

  it('falls back to light when matchMedia is unavailable', async () => {
    vi.resetModules();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
    setActivePinia(createPinia());
    const { useConfigStore } = await import('@/utils/configStore');
    const { useUiTheme } = await import('@/composables/useUiTheme');
    const config = useConfigStore();
    config.uiTheme = 'auto';
    await nextTick();
    expect(useUiTheme().isDark.value).toBe(false);
  });
});
