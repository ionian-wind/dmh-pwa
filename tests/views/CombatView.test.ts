import { mount, flushPromises } from '@vue/test-utils';
import CombatView from '../../src/encounters/CombatView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router and route
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'c1' } }),
  useRouter: () => ({ push: vi.fn() })
}));

// Mock stores
vi.mock('@/stores/combats', () => ({
  useCombatStore: () => ({
    loadCombats: vi.fn(),
    getCombatById: vi.fn((id) => id === 'c1' ? {
      id: 'c1',
      encounterId: 'e1',
      partyId: 'p1',
      status: 'preparing',
      currentRound: 1,
      currentTurn: 0,
      combatants: [
        { id: 'cb1', name: 'Alice', type: 'player', initiative: 10, hitPoints: { maximum: 10, current: 10, temporary: 0 }, conditions: [], referenceId: 'char1', notes: '', createdAt: 0, updatedAt: 0 }
      ],
      notes: 'Combat notes',
      createdAt: 0,
      updatedAt: 0
    } : null),
    deleteCombat: vi.fn(),
    startCombat: vi.fn(),
    endCombat: vi.fn(),
    resetCombat: vi.fn()
  })
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    loadEncounters: vi.fn(),
    getEncounterById: vi.fn((id) => id === 'e1' ? { id: 'e1', name: 'Encounter', moduleId: 'mod-1' } : null )
  })
}));
vi.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    loadParties: vi.fn(),
    getPartyById: vi.fn((id) => id === 'p1' ? { id: 'p1', name: 'Party' } : null )
  })
}));
vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    loadModules: vi.fn(),
    modules: [ { id: 'mod-1', name: 'Module One' } ]
  })
}));

// Mock components
vi.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: {
    name: 'BaseEntityView',
    props: ['entity', 'entityName', 'listRoute', 'onDelete', 'title', 'subtitle', 'notFound'],
    template: '<div class="base-entity-view"><slot /></div>'
  }
}));
vi.mock('@/components/CombatTracker.vue', () => ({
  __esModule: true,
  default: {
    name: 'CombatTracker',
    props: ['encounterId'],
    template: '<div class="combat-tracker">CombatTracker</div>'
  }
}));

describe('CombatView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders combat info and controls', async () => {
    const wrapper = mount(CombatView);
    await flushPromises();
    expect(wrapper.text()).toContain('Encounter');
    expect(wrapper.text()).toContain('Party');
    expect(wrapper.text()).toContain('Start Combat');
    expect(wrapper.find('.combat-tracker').exists()).toBe(true);
    expect(wrapper.text()).toContain('Combat notes');
  });

  it('calls startCombat, endCombat, resetCombat', async () => {
    const wrapper = mount(CombatView);
    await flushPromises();
    const store = require('@/stores/combats').useCombatStore();
    await wrapper.vm.startCombat();
    await wrapper.vm.endCombat();
    await wrapper.vm.resetCombat();
    expect(store.startCombat).toHaveBeenCalled();
    expect(store.endCombat).toHaveBeenCalled();
    expect(store.resetCombat).toHaveBeenCalled();
  });

  it('calls deleteCombat and navigates on delete', async () => {
    vi.fn(() => true);
    const wrapper = mount(CombatView);
    await flushPromises();
    await wrapper.vm.handleDelete();
    const store = require('@/stores/combats').useCombatStore();
    expect(store.deleteCombat).toHaveBeenCalled();
    const router = require('vue-router').useRouter();
    expect(router.push).toHaveBeenCalledWith('/encounters');
  });

  it('shows not found state if combat is missing', async () => {
    vi.mock('@/stores/combats', () => ({
      useCombatStore: () => ({
        loadCombats: vi.fn(),
        getCombatById: vi.fn(() => null),
        deleteCombat: vi.fn(),
        startCombat: vi.fn(),
        endCombat: vi.fn(),
        resetCombat: vi.fn()
      })
    }));
    const wrapper = mount(CombatView);
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });
}); 
