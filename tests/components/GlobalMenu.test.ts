import { mount, flushPromises } from '@vue/test-utils';
import GlobalMenu from '@/components/GlobalMenu.vue';
import { createTestingPinia } from '@pinia/testing';
import { useModuleStore } from '@/stores/modules';
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { nextTick } from 'vue';
import { vi } from 'vitest';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key: string) => key }) }));

describe('GlobalMenu', () => {
  let router;
  let moduleStore;

  beforeEach(() => {
    const routes: RouteRecordRaw[] = [
      { path: '/notes', name: 'Notes', component: { template: '<div />' } },
      { path: '/parties', name: 'Parties', component: { template: '<div />' } },
      { path: '/monsters', name: 'Monsters', component: { template: '<div />' } },
      { path: '/encounters', name: 'Encounters', component: { template: '<div />' } },
      { path: '/characters', name: 'Characters', component: { template: '<div />' } },
      { path: '/modules', name: 'Modules', component: { template: '<div />' } }
    ];
    router = createRouter({
      history: createWebHistory(),
      routes
    });
    moduleStore = useModuleStore();
    moduleStore.modules = [
      { id: 'mod-1', name: 'Module One' },
      { id: 'mod-2', name: 'Module Two' }
    ];
    moduleStore.currentModule = { id: 'mod-1', name: 'Module One' };
    moduleStore.currentModuleFilter = 'mod-1';
    moduleStore.setCurrentModuleFilter = vi.fn();
  });

  it('renders module selector and menu items', async () => {
    const wrapper = mount(GlobalMenu, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), router]
      }
    });
    expect(wrapper.find('select').exists()).toBe(true);
    expect(wrapper.findAll('option').length).toBeGreaterThan(2);
    expect(wrapper.findAllComponents({ name: 'Button' }).length).toBeGreaterThan(0);
  });

  it('calls setCurrentModuleFilter on select change', async () => {
    const wrapper = mount(GlobalMenu, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), router]
      }
    });
    const select = wrapper.find('select');
    await select.setValue('mod-2');
    expect(moduleStore.setCurrentModuleFilter).toHaveBeenCalledWith('mod-2');
  });

  it('navigates to section on button click', async () => {
    router.push = vi.fn();
    const wrapper = mount(GlobalMenu, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), router]
      }
    });
    const btn = wrapper.findAllComponents({ name: 'Button' })[0];
    await btn.trigger('click');
    expect(router.push).toHaveBeenCalled();
  });

  it('shows current module and clear button', () => {
    const wrapper = mount(GlobalMenu, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), router]
      }
    });
    expect(wrapper.text()).toContain('common.currentModule');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('applies active class to active section', async () => {
    await router.push('/notes');
    await router.isReady();
    const wrapper = mount(GlobalMenu, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn }), router]
      }
    });
    await nextTick();
    const activeBtn = wrapper.find('.btn.active');
    expect(activeBtn.exists()).toBe(true);
  });
}); 