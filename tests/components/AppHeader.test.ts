import { mount } from '@vue/test-utils';
import AppHeader from '@/components/AppHeader.vue';
import GlobalMenu from '@/components/GlobalMenu.vue';
import LanguageSwitcher from '@/components/LanguageSwitcher.vue';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

describe('AppHeader', () => {
  const routes: RouteRecordRaw[] = [
    { path: '/configuration', name: 'Configuration', component: { template: '<div />' } }
  ];
  const router = createRouter({
    history: createWebHistory(),
    routes
  });

  it('renders header, GlobalMenu, and LanguageSwitcher', () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router],
        stubs: { GlobalMenu, LanguageSwitcher }
      }
    });
    expect(wrapper.find('header.app-header').exists()).toBe(true);
    expect(wrapper.findComponent(GlobalMenu).exists()).toBe(true);
    expect(wrapper.findComponent(LanguageSwitcher).exists()).toBe(true);
  });

  it('renders configuration nav button', () => {
    const wrapper = mount(AppHeader, {
      global: {
        plugins: [router],
        stubs: { GlobalMenu, LanguageSwitcher }
      }
    });
    expect(wrapper.find('.config-button').exists()).toBe(true);
    expect(wrapper.find('.config-button').attributes('href')).toBe('/configuration');
  });
}); 