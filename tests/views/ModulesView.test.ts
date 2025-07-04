import { mount, flushPromises } from '@vue/test-utils';
import ModulesView from '../../src/modules/ModulesView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock ModuleCard and ModuleEditor
vi.mock('@/components/ModuleCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'ModuleCard',
    props: ['module'],
    emits: ['view', 'edit', 'delete'],
    template: '<div class="module-card">ModuleCard</div>'
  }
}));
vi.mock('@/components/ModuleEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'ModuleEditor',
    props: ['module', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="module-editor">ModuleEditor</div>'
  }
}));

// Mock store
vi.mock('@/stores/modules', () => {
  const modules = [
    { id: '1', name: 'Alpha', description: 'First', createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Beta', description: 'Second', createdAt: 0, updatedAt: 0 }
  ];
  return {
    useModuleStore: () => ({
      modules,
      loadModules: vi.fn(),
      createModule: vi.fn(),
      updateModule: vi.fn(),
      deleteModule: vi.fn()
    })
  };
});

describe('ModulesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(ModulesView);
    expect(wrapper.find('h1').text()).toBe('Modules');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no modules', async () => {
    vi.doMock('@/stores/modules', () => ({
      useModuleStore: () => ({ modules: [], loadModules: vi.fn(), createModule: vi.fn(), updateModule: vi.fn(), deleteModule: vi.fn() })
    }));
    const wrapper = mount(ModulesView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No modules yet');
  });

  it('shows modules grid if modules exist', () => {
    const wrapper = mount(ModulesView);
    expect(wrapper.find('.modules-grid').exists()).toBe(true);
    expect(wrapper.findAll('.module-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(ModulesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'ModuleEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from ModuleCard', async () => {
    const wrapper = mount(ModulesView);
    await wrapper.findAllComponents({ name: 'ModuleCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ModuleEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(ModulesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'ModuleEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ModuleEditor' }).exists()).toBe(false);
  });

  it('calls store createModule on submit if no id', async () => {
    const wrapper = mount(ModulesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/modules').useModuleStore();
    await wrapper.findComponent({ name: 'ModuleEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.createModule).toHaveBeenCalled();
  });

  it('calls store updateModule on submit if id exists', async () => {
    const wrapper = mount(ModulesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/modules').useModuleStore();
    await wrapper.findComponent({ name: 'ModuleEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.updateModule).toHaveBeenCalled();
  });

  it('calls store deleteModule on delete event', async () => {
    window.confirm = vi.fn(() => true);
    const wrapper = mount(ModulesView);
    const store = require('@/stores/modules').useModuleStore();
    await wrapper.findAllComponents({ name: 'ModuleCard' })[0].vm.$emit('delete', { id: '1', name: 'Alpha' });
    expect(store.deleteModule).toHaveBeenCalledWith('1');
  });
}); 
