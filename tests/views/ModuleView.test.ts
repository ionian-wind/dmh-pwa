import { mount, flushPromises } from '@vue/test-utils';
import ModuleView from '@/views/ModuleView.vue';

jest.mock('@/components/ModuleEditor.vue', () => ({
  __esModule: true,
  default: { name: 'ModuleEditor', template: '<div />' }
}));
jest.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    loadModules: jest.fn(),
    getModuleById: (id: string) => id === 'm1' ? { id: 'm1', name: 'Test Module', description: 'Desc', createdAt: 0, updatedAt: 0 } : null,
    updateModule: jest.fn(),
    deleteModule: jest.fn()
  })
}));
jest.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    loadParties: jest.fn(),
    parties: [ { id: 'p1', name: 'Party', moduleIds: ['m1'] } ]
  })
}));
jest.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    loadMonsters: jest.fn(),
    monsters: [ { id: 'mo1', name: 'Monster', moduleId: 'm1', type: 'Beast' } ]
  })
}));
jest.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    loadEncounters: jest.fn(),
    encounters: [ { id: 'e1', name: 'Encounter', moduleId: 'm1', description: 'Fight' } ]
  })
}));
jest.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    loadNotes: jest.fn(),
    notes: [ { id: 'n1', title: 'Note', moduleId: 'm1', content: 'Note content' } ]
  })
}));

const $route = { params: { id: 'm1' } };
const $router = { push: jest.fn() };

describe('ModuleView', () => {
  it('renders module content and all sections', async () => {
    const wrapper = mount(ModuleView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Test Module');
    expect(wrapper.text()).toContain('Parties');
    expect(wrapper.text()).toContain('Monsters');
    expect(wrapper.text()).toContain('Encounters');
    expect(wrapper.text()).toContain('Notes');
    expect(wrapper.text()).toContain('Party');
    expect(wrapper.text()).toContain('Monster');
    expect(wrapper.text()).toContain('Encounter');
    expect(wrapper.text()).toContain('Note');
  });

  it('shows editor when showEditor is true', async () => {
    const wrapper = mount(ModuleView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    wrapper.vm.showEditor = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'ModuleEditor' }).exists()).toBe(true);
  });

  it('calls updateModule and updates module on submit', async () => {
    const wrapper = mount(ModuleView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const updated = { name: 'Updated Module', description: 'New desc' };
    await wrapper.vm.handleSubmit(updated);
    expect(wrapper.vm.module.name).toBe('Updated Module');
  });

  it('calls deleteModule on handleDelete', async () => {
    const wrapper = mount(ModuleView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDelete();
    expect(require('@/stores/modules').useModuleStore().deleteModule).toHaveBeenCalledWith('m1');
  });

  it('sets notFound if module is missing', async () => {
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(ModuleView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });
}); 