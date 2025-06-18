import { mount } from '@vue/test-utils';
import PWAStatus from '@/components/PWAStatus.vue';

describe('PWAStatus', () => {
  beforeEach(() => {
    // Mock navigator.onLine and matchMedia
    Object.defineProperty(window.navigator, 'onLine', { value: true, configurable: true });
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  it('renders status indicators', () => {
    const wrapper = mount(PWAStatus);
    expect(wrapper.find('.pwa-status-indicators').exists()).toBe(true);
  });

  it('shows offline indicator when offline', async () => {
    Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
    const wrapper = mount(PWAStatus);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('Offline Mode');
  });

  it('shows standalone indicator when in app mode', async () => {
    window.matchMedia = jest.fn().mockReturnValue({ matches: true });
    const wrapper = mount(PWAStatus);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('App Mode');
  });

  it('shows update prompt and handles update/dismiss', async () => {
    const wrapper = mount(PWAStatus);
    await wrapper.setData({ showUpdatePrompt: true });
    expect(wrapper.find('.pwa-update-prompt').exists()).toBe(true);
    await wrapper.find('.pwa-update-btn').trigger('click');
    await wrapper.find('.pwa-dismiss-btn').trigger('click');
    expect(wrapper.vm.showUpdatePrompt).toBe(false);
  });
}); 