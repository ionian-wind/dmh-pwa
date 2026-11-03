import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import { useConfigStore, JukeboxRepeatMode } from '@/utils/configStore';

function setLanguage(language: string | undefined) {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: language,
  });
}

describe('config store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    setLanguage('en-US');
  });

  afterEach(() => {
    vi.mocked(localStorage.getItem).mockReset();
    setLanguage('en-US');
  });

  it('uses defaults when nothing is stored', () => {
    const config = useConfigStore();

    expect(config.jukeboxLastTrackId).toBeNull();
    expect(config.jukeboxLastTrackProgress).toBe(0);
    expect(config.jukeboxLastVolume).toBe(1);
    expect(config.jukeboxRepeatMode).toBe(JukeboxRepeatMode.off);
    expect(config.jukeboxDisplayCoverWhilePlaying).toBe(true);
    expect(config.jukeboxUseMiniPlayer).toBe(true);
    expect(config.savedLanguage).toBe('en');
  });

  it('reads persisted values and Russian browser defaults', () => {
    setLanguage('ru-RU');
    vi.mocked(localStorage.getItem).mockImplementation((key: string) =>
      key === 'dmh-config:savedLanguage' ? JSON.stringify('de') : null,
    );
    const config = useConfigStore();
    expect(config.savedLanguage).toBe('de');

    vi.mocked(localStorage.getItem).mockReturnValue(null);
    setActivePinia(createPinia());
    expect(useConfigStore().savedLanguage).toBe('ru');
  });

  it('falls back to English for non-Russian or missing languages', () => {
    setLanguage(undefined);
    expect(useConfigStore().savedLanguage).toBe('en');

    setLanguage('fr-FR');
    setActivePinia(createPinia());
    expect(useConfigStore().savedLanguage).toBe('en');
  });

  it('persists changes and removes values set to undefined', async () => {
    const config = useConfigStore();

    config.confirmDelete = false;
    await nextTick();
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'dmh-config:confirmDelete',
      'false',
    );

    config.confirmDelete = undefined as any;
    await nextTick();
    expect(localStorage.removeItem).toHaveBeenCalledWith(
      'dmh-config:confirmDelete',
    );
  });
});
