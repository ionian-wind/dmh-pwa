import { mount, flushPromises } from '@vue/test-utils';
import EncounterView from '@/views/EncounterView.vue';
import { vi } from 'vitest';

vi.mock('@/components/EncounterEditor.vue', () => ({
  __esModule: true,
  default: { name: 'EncounterEditor', template: '<div />' }
}));
vi.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
vi.mock('@/components/common/BaseModal.vue', () => ({
  __esModule: true,
  default: { name: 'BaseModal', template: '<div><slot /></div>' }
}));
vi.mock('@/components/common/ToggleSwitch.vue', () => ({
  __esModule: true,
  default: { name: 'ToggleSwitch', template: '<div />' }
}));
vi.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: { name: 'Button', template: '<button><slot /></button>' }
}));
vi.mock('@/components/PartySelector.vue', () => ({
  __esModule: true,
  default: { name: 'PartySelector', template: '<div />' }
}));
vi.mock('@/components/common/TabGroup.vue', () => ({
  __esModule: true,
  default: { name: 'TabGroup', template: '<div />' }
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    loadEncounters: vi.fn(),
    getEncounterById: (id: string) => id === 'e1' ? { id: 'e1', name: 'Test Encounter', level: 3, difficulty: 'Medium', xp: 200, moduleId: 'mod-1', monsters: { m1: 2 }, createdAt: 0, updatedAt: 0 } : null,
    updateEncounter: vi.fn(),
    deleteEncounter: vi.fn(),
    getMonsterCount: vi.fn(() => 2),
    setMonsterCount: vi.fn(),
    addMonster: vi.fn(),
    removeMonster: vi.fn()
  })
}));
vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    loadMonsters: vi.fn(),
    filteredMonsters: [ { id: 'm1', name: 'Goblin' }, { id: 'm2', name: 'Orc' } ],
    monsters: [ { id: 'm1', name: 'Goblin' }, { id: 'm2', name: 'Orc' } ]
  })
}));
vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    loadModules: vi.fn(),
    modules: [ { id: 'mod-1', name: 'Module One' } ]
  })
}));
vi.mock('@/stores/combats', () => ({
  useCombatStore: () => ({
    loadCombats: vi.fn()
  })
}));
vi.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    loadParties: vi.fn(),
    parties: [ { id: 'p1', name: 'Party' } ]
  })
}));
vi.mock('@/stores/characters', () => ({}));

const $route = { params: { id: 'e1' } };
const $router = { push: vi.fn() };

describe('EncounterView', () => {
  it('renders encounter content and title', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Test Encounter');
    expect(wrapper.text()).toContain('Level 3');
    expect(wrapper.text()).toContain('Medium');
    expect(wrapper.text()).toContain('200');
  });

  it('shows editor when isEditorOpen is true', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    wrapper.vm.isEditorOpen = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'EncounterEditor' }).exists()).toBe(true);
  });

  it('calls updateEncounter and updates encounter on submit', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const updated = { ...wrapper.vm.encounter, name: 'Updated Encounter' };
    await wrapper.vm.handleSubmit(updated);
    expect(wrapper.vm.encounter.name).toBe('Updated Encounter');
  });

  it('calls deleteEncounter on handleDelete', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDelete();
    expect(require('@/stores/encounters').useEncounterStore().deleteEncounter).toHaveBeenCalledWith('e1');
  });

  it('handles monster linking and count', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleToggleMonster({ id: 'm2', name: 'Orc' }, true);
    expect(require('@/stores/encounters').useEncounterStore().addMonster).toHaveBeenCalled();
    await wrapper.vm.handleToggleMonster({ id: 'm1', name: 'Goblin' }, false);
    expect(require('@/stores/encounters').useEncounterStore().removeMonster).toHaveBeenCalled();
  });

  it('handles run combat and party selector', async () => {
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    wrapper.vm.showPartySelector = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartySelector' }).exists()).toBe(true);
    await wrapper.vm.handleCombatCreated({ id: 'combat-1' });
    expect($router.push).toHaveBeenCalledWith('/combats/combat-1');
  });

  it('sets notFound if encounter is missing', async () => {
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(EncounterView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });
}); 