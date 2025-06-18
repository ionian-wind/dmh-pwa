import { mount } from '@vue/test-utils';
import PWAInstallPrompt from '@/components/PWAInstallPrompt.vue';

describe('PWAInstallPrompt', () => {
  it('renders prompt when showInstallPrompt is true', async () => {
    const wrapper = mount(PWAInstallPrompt);
    await wrapper.setData({ showInstallPrompt: true });
    expect(wrapper.find('.pwa-install-prompt').exists()).toBe(true);
    expect(wrapper.text()).toContain('Install D&D Notes Manager');
  });

  it('calls installApp when Install is clicked', async () => {
    const wrapper = mount(PWAInstallPrompt);
    await wrapper.setData({ showInstallPrompt: true, deferredPrompt: { prompt: jest.fn(), userChoice: Promise.resolve({ outcome: 'accepted' }) } });
    await wrapper.find('.pwa-install-btn').trigger('click');
    expect(wrapper.vm.deferredPrompt).toBeNull();
    expect(wrapper.vm.showInstallPrompt).toBe(false);
  });

  it('calls dismissPrompt when Not now is clicked', async () => {
    const wrapper = mount(PWAInstallPrompt);
    await wrapper.setData({ showInstallPrompt: true });
    await wrapper.find('.pwa-dismiss-btn').trigger('click');
    expect(wrapper.vm.showInstallPrompt).toBe(false);
  });
}); 