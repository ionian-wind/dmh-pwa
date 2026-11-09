import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h, nextTick } from 'vue';

import SettingsDialog from '@/components/SettingsDialog.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import App from '@/App.vue';
import SoundControlDialog from '@/jukebox/components/SoundControlDialog.vue';
import { useConfigStore } from '@/utils/configStore';
import { quasarStubs } from '../helpers/quasar-stubs';

const resetMocks = vi.hoisted(() => ({
  clearAllAppData: vi.fn(),
  reloadAppFromMainPage: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/utils/appReset', () => ({
  clearAllAppData: resetMocks.clearAllAppData,
  reloadAppFromMainPage: resetMocks.reloadAppFromMainPage,
}));

vi.mock('@/dialogs', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  confirm: resetMocks.confirm,
}));

const storageMocks = vi.hoisted(() => ({
  diagnostics: vi.fn(),
  requestPersistence: vi.fn(),
  pickFiles: vi.fn(),
  relink: vi.fn(),
  migrate: vi.fn(),
}));

vi.mock('@/utils/files', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  getFileStorageDiagnostics: storageMocks.diagnostics,
  requestPersistentStorage: storageMocks.requestPersistence,
  pickFiles: storageMocks.pickFiles,
  relinkStoredFile: storageMocks.relink,
  migrateAllBlobFilesToOpfs: storageMocks.migrate,
}));

const QToggleStub = quasarStubs.QToggle;

vi.mock('@/jukebox/playerStore', () => ({
  useJukeboxPlayerStore: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    isPlaying: false,
  }),
}));

vi.mock('@/stores/timers', () => ({
  useTimerStore: () => ({
    init: vi.fn().mockResolvedValue(undefined),
    now: 0,
    running: false,
  }),
}));

describe('settings dialog', () => {
  beforeEach(() => {
    storageMocks.diagnostics.mockReset().mockResolvedValue({
      supported: true,
      usage: 1024,
      quota: 10 * 1024,
      persisted: false,
      fileCount: 3,
      totalFileBytes: 100,
      byKind: { blob: 1, handle: 1, opfs: 1 },
      unavailableCount: 0,
      unavailableFiles: [],
    });
    storageMocks.requestPersistence.mockReset().mockResolvedValue(true);
    storageMocks.pickFiles.mockReset().mockResolvedValue([]);
    storageMocks.relink.mockReset().mockResolvedValue(undefined);
    storageMocks.migrate.mockReset().mockResolvedValue(0);
  });

  it('shows the language selector and closes through the modal', async () => {
    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.text()).toContain('Language');
    expect(wrapper.text()).not.toContain('Quasar');
    expect(wrapper.findComponent(LanguageSwitcher).exists()).toBe(true);
    expect(wrapper.find('[data-test="settings-ui-theme"]').exists()).toBe(true);

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('switches the UI theme from the interface settings', async () => {
    const config = useConfigStore();
    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    const toggle = wrapper.findComponent({ name: 'QBtnToggle' });
    expect(toggle.props('options').map((option: any) => option.value)).toEqual([
      'light',
      'dark',
      'auto',
    ]);
    expect(toggle.props('options').map((option: any) => option.slot)).toEqual([
      'light',
      'dark',
      'auto',
    ]);
    expect(toggle.props('modelValue')).toBe('light');

    const buttons = toggle.findAll('button');
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.find('svg').exists()).toBe(true);
    }
    expect(buttons[0].attributes('aria-label')).toBe('Light');
    expect(buttons[1].attributes('aria-label')).toBe('Dark');
    expect(buttons[2].attributes('aria-label')).toBe('Auto');

    await buttons[1].trigger('click');
    expect(config.uiTheme).toBe('dark');
    wrapper.unmount();
  });

  it('clears all site storage after confirmation and reloads', async () => {
    resetMocks.confirm.mockReset().mockResolvedValue(true);
    resetMocks.clearAllAppData.mockReset().mockResolvedValue(undefined);
    resetMocks.reloadAppFromMainPage.mockReset();

    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Content');
    expect(wrapper.text()).toContain('Clear storage');
    const clear = wrapper.find('.settings-clear-storage');
    expect(clear.attributes('color')).toBe('negative');

    await clear.trigger('click');
    await flushPromises();

    expect(resetMocks.confirm).toHaveBeenCalledWith(
      expect.stringContaining('permanently delete'),
      expect.objectContaining({ force: true, okColor: 'negative' }),
    );
    expect(resetMocks.clearAllAppData).toHaveBeenCalled();
    expect(resetMocks.reloadAppFromMainPage).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('does not clear storage when confirmation is cancelled', async () => {
    resetMocks.confirm.mockReset().mockResolvedValue(false);
    resetMocks.clearAllAppData.mockReset();
    resetMocks.reloadAppFromMainPage.mockReset();

    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();
    await wrapper.find('.settings-clear-storage').trigger('click');
    await flushPromises();

    expect(resetMocks.clearAllAppData).not.toHaveBeenCalled();
    expect(resetMocks.reloadAppFromMainPage).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows storage diagnostics and requests persistent storage', async () => {
    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Storage');
    expect(wrapper.text()).toContain('1.0 KB of 10 KB used');
    expect(wrapper.text()).toContain('3 files');
    expect(wrapper.text()).toContain('Not granted');
    expect(wrapper.text()).toContain('Local: 1 · OPFS: 1 · Linked: 1');

    await wrapper.find('.settings-request-persistence').trigger('click');
    await flushPromises();

    expect(storageMocks.requestPersistence).toHaveBeenCalled();
    expect(storageMocks.diagnostics).toHaveBeenCalledTimes(2);
    expect(
      wrapper.find('[data-test="settings-persistence-message"]').text(),
    ).toContain('Persistent storage granted.');
    wrapper.unmount();
  });

  it('explains when the browser denies persistent storage', async () => {
    storageMocks.requestPersistence.mockResolvedValue(false);
    const wrapper = mount(SettingsDialog, { props: { modelValue: true } });
    await flushPromises();

    await wrapper.find('.settings-request-persistence').trigger('click');
    await flushPromises();

    expect(
      wrapper.find('[data-test="settings-persistence-message"]').text(),
    ).toContain('did not grant persistent storage');
    const links = wrapper.findAll('.help-link');
    expect(links).toHaveLength(2);
    expect(links[0].attributes('href')).toContain(
      '/help/en/getting-started/install.html',
    );
    expect(links[0].attributes('target')).toBe('_blank');
    expect(links[1].attributes('href')).toContain(
      '/help/en/troubleshooting/persistent-storage.html',
    );
    expect(links[1].attributes('rel')).toBe('noopener noreferrer');
    wrapper.unmount();
  });

  it('reconnects unavailable files and migrates large blobs', async () => {
    const file = new File(['lost'], 'lost.mp3', { type: 'audio/mpeg' });
    storageMocks.diagnostics.mockResolvedValue({
      supported: true,
      usage: 1024,
      quota: 10 * 1024,
      persisted: true,
      fileCount: 1,
      totalFileBytes: 4,
      byKind: { blob: 1, handle: 0, opfs: 0 },
      unavailableCount: 1,
      unavailableFiles: [
        {
          id: 'f1',
          name: 'lost.mp3',
          size: 4,
          type: 'audio/mpeg',
          reason: 'unavailable',
        },
      ],
    });
    storageMocks.pickFiles.mockResolvedValue([
      { file, source: { kind: 'blob', blob: file } },
    ]);

    const wrapper = mount(SettingsDialog, { props: { modelValue: true } });
    await flushPromises();

    await wrapper.find('.settings-reconnect-files').trigger('click');
    await flushPromises();

    expect(storageMocks.pickFiles).toHaveBeenCalled();
    expect(storageMocks.relink).toHaveBeenCalledWith('f1', file, {
      kind: 'blob',
      blob: file,
    });
    expect(wrapper.text()).toContain('1 files reconnected.');

    await wrapper.find('.settings-migrate-files').trigger('click');
    await flushPromises();
    expect(storageMocks.migrate).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('updates interface and player options', async () => {
    const config = useConfigStore();
    config.confirmDelete = true;
    config.expandMenu = true;
    config.jukeboxSmoothTrackChange = false;
    config.jukeboxAnimatePlayerBackground = true;
    config.jukeboxDisplayCoverWhilePlaying = true;
    config.jukeboxUseMiniPlayer = true;
    config.backupIncludeExternalFiles = false;

    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Interface');
    expect(wrapper.text()).toContain('Player');
    expect(wrapper.text()).toContain('Confirm deletion');
    expect(wrapper.text()).toContain('Expand menu');
    expect(wrapper.text()).toContain('Cross-fade');
    expect(wrapper.text()).toContain('animated album-colour gradient');
    expect(wrapper.text()).toContain('Display cover while playing');
    expect(wrapper.text()).toContain('Show player dialog');

    const toggles = wrapper.findAllComponents(QToggleStub);
    expect(toggles).toHaveLength(7);

    toggles[0].vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.confirmDelete).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[1]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.expandMenu).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[2]
      .vm.$emit('update:modelValue', true);
    await nextTick();
    expect(config.jukeboxSmoothTrackChange).toBe(true);

    wrapper
      .findAllComponents(QToggleStub)[3]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.jukeboxAnimatePlayerBackground).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[4]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.jukeboxDisplayCoverWhilePlaying).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[5]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.jukeboxUseMiniPlayer).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[6]
      .vm.$emit('update:modelValue', true);
    await nextTick();
    expect(config.backupIncludeExternalFiles).toBe(true);
    wrapper.unmount();
  });

  it('persists the selected language', async () => {
    const config = useConfigStore();
    config.savedLanguage = 'en';
    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    wrapper
      .findComponent(LanguageSwitcher)
      .findComponent(quasarStubs.QSelect)
      .vm.$emit('update:modelValue', 'ru');
    await nextTick();

    expect(config.savedLanguage).toBe('ru');
    wrapper.unmount();
  });

  it('opens from the left navigation menu item', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => h('div') } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    const settingsButton = wrapper.find('[data-test="open-settings"]');
    expect(settingsButton.exists()).toBe(true);
    await settingsButton.trigger('click');
    await nextTick();

    expect(wrapper.findComponent(SettingsDialog).props('modelValue')).toBe(
      true,
    );
    wrapper.unmount();
  });

  it('renders flat primary navigation items with separators', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => h('div') } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();
    (wrapper.vm as any).$i18n.locale = 'en';
    await nextTick();

    const getTitles = () =>
      wrapper
        .findAll('.left-sidebar [data-stub="QItem"]')
        .map((item) => item.attributes('title'))
        .filter((title): title is string => !!title);

    expect(getTitles()).toEqual([
      'Characters',
      'Notes',
      'Pawns',
      'Encounters',
      'Maps',
      'Timers',
      'Calculator',
      'Probability Calculator',
      'Dice Roller',
      'Jukebox',
      'Help center',
      'Settings',
    ]);
    expect(getTitles()).not.toContain('Game Sessions');
    expect(getTitles()).not.toContain('Scribe');
    expect(getTitles()).not.toContain('Tools');
    expect(
      wrapper.findAll('.left-sidebar [data-stub="QSeparator"]'),
    ).toHaveLength(2);

    const sequence = wrapper
      .findAll(
        '.left-sidebar [data-stub="QItem"], .left-sidebar [data-stub="QSeparator"]',
      )
      .slice(0, 10)
      .map((entry) =>
        entry.attributes('data-stub') === 'QSeparator'
          ? '|'
          : entry.attributes('title'),
      );
    expect(sequence).toEqual([
      'Characters',
      '|',
      'Notes',
      'Pawns',
      'Encounters',
      'Maps',
      '|',
      'Timers',
      'Calculator',
      'Probability Calculator',
    ]);
    wrapper.unmount();
  });

  it('keeps the menu mini when expand menu is disabled', async () => {
    const config = useConfigStore();
    config.expandMenu = true;
    config.savedLanguage = 'en';
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/', component: { render: () => h('div') } }],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, { global: { plugins: [router] } });
    await flushPromises();

    const drawer = wrapper.find('.left-sidebar');
    expect(drawer.attributes('title')).toBeUndefined();
    expect(
      wrapper.find('[data-test="open-settings"]').attributes('title'),
    ).toBeTruthy();

    await drawer.trigger('mouseenter');
    await nextTick();
    expect(drawer.attributes('mini')).not.toBe('true');

    config.expandMenu = false;
    await nextTick();
    expect(drawer.attributes('mini')).toBe('true');

    await drawer.trigger('mouseenter');
    await nextTick();
    expect(drawer.attributes('mini')).toBe('true');
    wrapper.unmount();
  });

  it('opens the mini player or navigates when mini player is disabled', async () => {
    const config = useConfigStore();
    config.jukeboxUseMiniPlayer = true;
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { render: () => h('div') } },
        { path: '/jukebox', component: { render: () => h('div') } },
      ],
    });
    await router.push('/');
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });
    await flushPromises();

    const jukeboxButton = wrapper.find('.jukebox-button');
    await jukeboxButton.trigger('click');
    await nextTick();
    expect(wrapper.findComponent(SoundControlDialog).props('modelValue')).toBe(
      true,
    );

    await jukeboxButton.trigger('click');
    await nextTick();
    expect(wrapper.findComponent(SoundControlDialog).props('modelValue')).toBe(
      false,
    );

    config.jukeboxUseMiniPlayer = false;
    await jukeboxButton.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe('/jukebox');
    expect(wrapper.findComponent(SoundControlDialog).props('modelValue')).toBe(
      false,
    );
    wrapper.unmount();
  });
});
