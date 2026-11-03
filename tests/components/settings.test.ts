import { describe, expect, it, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { h, nextTick } from 'vue';

import SettingsDialog from '@/components/SettingsDialog.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import App from '@/App.vue';
import { useConfigStore } from '@/utils/configStore';
import { quasarStubs } from '../helpers/quasar-stubs';
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
  it('shows the language selector and closes through the modal', async () => {
    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.text()).toContain('Language');
    expect(wrapper.text()).not.toContain('Quasar');
    expect(wrapper.findComponent(LanguageSwitcher).exists()).toBe(true);

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
    wrapper.unmount();
  });

  it('updates interface and player options', async () => {
    const config = useConfigStore();
    config.confirmDelete = true;
    config.jukeboxSmoothTrackChange = false;
    config.jukeboxAnimatePlayerBackground = true;
    config.jukeboxDisplayCoverWhilePlaying = true;

    const wrapper = mount(SettingsDialog, {
      props: { modelValue: true },
    });
    await nextTick();

    expect(wrapper.text()).toContain('Interface');
    expect(wrapper.text()).toContain('Player');
    expect(wrapper.text()).toContain('Confirm deletion');
    expect(wrapper.text()).toContain('Cross-fade');
    expect(wrapper.text()).toContain('animated album-colour gradient');
    expect(wrapper.text()).toContain('Display cover while playing');

    const toggles = wrapper.findAllComponents(QToggleStub);
    expect(toggles).toHaveLength(4);

    toggles[0].vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.confirmDelete).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[1]
      .vm.$emit('update:modelValue', true);
    await nextTick();
    expect(config.jukeboxSmoothTrackChange).toBe(true);

    wrapper
      .findAllComponents(QToggleStub)[2]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.jukeboxAnimatePlayerBackground).toBe(false);

    wrapper
      .findAllComponents(QToggleStub)[3]
      .vm.$emit('update:modelValue', false);
    await nextTick();
    expect(config.jukeboxDisplayCoverWhilePlaying).toBe(false);
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
});
