import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';
import PWAStatus from '@/components/PWAStatus.vue';

const QBannerStub = defineComponent({
  name: 'QBanner',
  setup(_, { slots }) {
    return () =>
      h('div', [
        slots.avatar?.(),
        slots.default?.(),
        slots.action?.(),
      ]);
  },
});

function mountInstall() {
  return mount(PWAInstallPrompt, {
    global: { stubs: { QBanner: QBannerStub } },
  });
}

function installEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt') as any;
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('PWA components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    delete (navigator as any).serviceWorker;
    delete (navigator as any).standalone;
    vi.restoreAllMocks();
  });

  it('shows the install banner and handles a successful install', async () => {
    const removeListener = vi.spyOn(window, 'removeEventListener');
    const wrapper = mountInstall();
    expect(wrapper.text()).toBe('');

    const event = installEvent('accepted');
    window.dispatchEvent(event);
    await flushPromises();

    expect(wrapper.text()).toContain('Install Owlbear');
    const installButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Install'));
    await installButton!.trigger('click');
    await flushPromises();

    expect(event.prompt).toHaveBeenCalled();
    expect(wrapper.text()).toBe('');

    wrapper.unmount();
    expect(removeListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function),
    );
  });

  it('dismisses the banner and closes it after appinstalled', async () => {
    const wrapper = mountInstall();
    window.dispatchEvent(installEvent('dismissed'));
    await flushPromises();

    const dismissButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Not now'));
    await dismissButton!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toBe('');

    window.dispatchEvent(installEvent());
    await flushPromises();
    expect(wrapper.text()).toContain('Install Owlbear');

    window.dispatchEvent(new Event('appinstalled'));
    await flushPromises();
    expect(wrapper.text()).toBe('');
    wrapper.unmount();
  });

  it('closes the banner when the native prompt rejects', async () => {
    const wrapper = mountInstall();
    const event = installEvent();
    event.prompt = vi.fn().mockRejectedValue(new Error('blocked'));
    window.dispatchEvent(event);
    await flushPromises();

    const installButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Install'));
    await installButton!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toBe('');
    wrapper.unmount();
  });

  it('shows offline and standalone statuses and hides them again', async () => {
    const listeners: Record<string, Function[]> = {};
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        addEventListener: vi.fn((name: string, handler: Function) => {
          (listeners[name] ||= []).push(handler);
        }),
        removeEventListener: vi.fn(),
      },
    });

    const wrapper = mount(PWAStatus);
    expect(wrapper.text()).not.toContain('Offline Mode');

    window.dispatchEvent(new Event('offline'));
    await flushPromises();
    expect(wrapper.text()).toContain('Offline Mode');

    window.dispatchEvent(new Event('online'));
    await flushPromises();
    expect(wrapper.text()).not.toContain('Offline Mode');

    listeners.controllerchange?.[0]?.(new Event('controllerchange'));
    await flushPromises();
    expect(wrapper.text()).toContain('Update Available');

    const laterButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Later'));
    await laterButton!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Update Available');

    wrapper.unmount();
  });

  it('shows app mode when running standalone', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const wrapper = mount(PWAStatus);
    await flushPromises();
    expect(wrapper.text()).toContain('App Mode');
    wrapper.unmount();
  });
});
