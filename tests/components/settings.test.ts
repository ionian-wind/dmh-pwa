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
    expect(wrapper.findComponent(LanguageSwitcher).exists()).toBe(true);

    wrapper.findComponent(BaseModal).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false]);
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
