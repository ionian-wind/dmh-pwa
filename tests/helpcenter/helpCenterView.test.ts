import { describe, expect, it } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import HelpCenterView from '@/helpcenter/HelpCenterView.vue';

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/help', name: 'help', component: HelpCenterView },
      {
        path: '/help/:pathMatch(.*)*',
        name: 'help-page',
        component: HelpCenterView,
      },
    ],
  });
}

describe('HelpCenterView', () => {
  it('renders a nested help page and navigates through internal links', async () => {
    const router = makeRouter();
    await router.push('/help/getting-started/install');
    await router.isReady();

    const wrapper = mount(HelpCenterView, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Install the app');
    expect(wrapper.text()).toContain('Chrome and Edge on desktop');
    expect(wrapper.findAll('.help-nav-item').length).toBeGreaterThan(3);
    expect(wrapper.find('.help-markdown img').exists()).toBe(true);

    const link = wrapper.find(
      'a[href="/help/troubleshooting/persistent-storage"]',
    );
    expect(link.exists()).toBe(true);
    await link.trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.path).toBe(
      '/help/troubleshooting/persistent-storage',
    );
    expect(wrapper.text()).toContain('Persistent storage');

    const navItem = wrapper
      .findAll('.help-nav-item')
      .find((item) => item.text() === 'Troubleshooting');
    expect(navItem).toBeTruthy();
    await navItem!.trigger('click');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/help/troubleshooting');

    wrapper.unmount();
  });

  it('shows a not-found state for an unknown page', async () => {
    const router = makeRouter();
    await router.push('/help/missing/page');
    await router.isReady();

    const wrapper = mount(HelpCenterView, {
      global: { plugins: [router] },
    });
    await flushPromises();

    expect(wrapper.text()).toContain('Help page not found.');
    wrapper.unmount();
  });

  it('renders the root and pages without descriptions', async () => {
    const router = makeRouter();
    await router.push('/help');
    await router.isReady();

    const wrapper = mount(HelpCenterView, {
      global: { plugins: [router] },
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Welcome to the Owlbear');

    await router.push('/help/reference/empty');
    await flushPromises();
    expect(wrapper.text()).toContain('A short note without');
    expect(wrapper.find('.text-subtitle1').exists()).toBe(false);
    wrapper.unmount();
  });

  it('leaves external and modifier-click links to the browser', async () => {
    const router = makeRouter();
    await router.push('/help/reference/browsers');
    await router.isReady();

    const wrapper = mount(HelpCenterView, {
      global: { plugins: [router] },
    });
    await flushPromises();

    const external = wrapper.find('a[href="https://developer.mozilla.org/"]');
    expect(external.exists()).toBe(true);
    external.element.addEventListener('click', (event) =>
      event.preventDefault(),
    );
    await external.trigger('click');
    expect(router.currentRoute.value.path).toBe('/help/reference/browsers');

    await router.push('/help/getting-started/install');
    await flushPromises();
    const internal = wrapper.find(
      'a[href="/help/troubleshooting/persistent-storage"]',
    );
    await internal.trigger('click', { metaKey: true });
    expect(router.currentRoute.value.path).toBe(
      '/help/getting-started/install',
    );
    wrapper.unmount();
  });
});
