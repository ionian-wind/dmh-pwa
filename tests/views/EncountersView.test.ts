import { mount, flushPromises } from '@vue/test-utils';
import EncountersView from '@/views/EncountersView.vue';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

// Mock EncounterCard, EncounterEditor, PartySelector
jest.mock('@/components/EncounterCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'EncounterCard',
    props: ['encounter'],
    emits: ['view', 'edit', 'delete', 'run-combat'],
    template: '<div class="encounter-card">EncounterCard</div>'
  }
}));
jest.mock('@/components/EncounterEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'EncounterEditor',
    props: ['encounter', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="encounter-editor">EncounterEditor</div>'
  }
}));
jest.mock('@/components/PartySelector.vue', () => ({
  __esModule: true,
  default: {
    name: 'PartySelector',
    props: ['isOpen', 'encounter'],
    emits: ['cancel', 'combat-created'],
    template: '<div class="party-selector">PartySelector</div>'
  }
}));

// Mock store
jest.mock('@/stores/encounters', () => {
  const encounters = [
    { id: '1', name: 'Alpha', description: 'First', level: 1, difficulty: 'Easy', xp: 100, moduleId: 'm1', monsters: { m1: 2 }, currentRound: 1, currentTurn: 0, createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Beta', description: 'Second', level: 2, difficulty: 'Medium', xp: 200, moduleId: 'm2', monsters: { m2: 1 }, currentRound: 1, currentTurn: 0, createdAt: 0, updatedAt: 0 }
  ];
  return {
    useEncounterStore: () => ({
      filteredEncounters: encounters,
      loadEncounters: jest.fn(),
      createEncounter: jest.fn(),
      updateEncounter: jest.fn(),
      deleteEncounter: jest.fn()
    })
  };
});
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ modules: [] }) }));

describe('EncountersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(EncountersView);
    expect(wrapper.find('h1').text()).toBe('Encounters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no encounters', async () => {
    jest.doMock('@/stores/encounters', () => ({
      useEncounterStore: () => ({ filteredEncounters: [], loadEncounters: jest.fn(), createEncounter: jest.fn(), updateEncounter: jest.fn(), deleteEncounter: jest.fn() })
    }));
    const wrapper = mount(EncountersView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No encounters yet');
  });

  it('shows encounters grid if encounters exist', () => {
    const wrapper = mount(EncountersView);
    expect(wrapper.find('.encounters-grid').exists()).toBe(true);
    expect(wrapper.findAll('.encounter-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'EncounterEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from EncounterCard', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findAllComponents({ name: 'EncounterCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'EncounterEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'EncounterEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'EncounterEditor' }).exists()).toBe(false);
  });

  it('calls store createEncounter on submit if no id', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/encounters').useEncounterStore();
    await wrapper.findComponent({ name: 'EncounterEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.createEncounter).toHaveBeenCalled();
  });

  it('calls store updateEncounter on submit if id exists', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/encounters').useEncounterStore();
    await wrapper.findComponent({ name: 'EncounterEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.updateEncounter).toHaveBeenCalled();
  });

  it('calls store deleteEncounter on delete event', async () => {
    window.confirm = jest.fn(() => true);
    const wrapper = mount(EncountersView);
    const store = require('@/stores/encounters').useEncounterStore();
    await wrapper.findAllComponents({ name: 'EncounterCard' })[0].vm.$emit('delete', { id: '1', name: 'Alpha' });
    expect(store.deleteEncounter).toHaveBeenCalledWith('1');
  });

  it('shows party selector and handles run-combat', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findAllComponents({ name: 'EncounterCard' })[0].vm.$emit('run-combat', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartySelector' }).exists()).toBe(true);
  });

  it('closes party selector on cancel', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findAllComponents({ name: 'EncounterCard' })[0].vm.$emit('run-combat', { id: '1' });
    await wrapper.vm.$nextTick();
    await wrapper.findComponent({ name: 'PartySelector' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartySelector' }).exists()).toBe(false);
  });

  it('navigates to combat view on combat-created', async () => {
    const wrapper = mount(EncountersView);
    await wrapper.findAllComponents({ name: 'EncounterCard' })[0].vm.$emit('run-combat', { id: '1' });
    await wrapper.vm.$nextTick();
    const router = require('vue-router').useRouter();
    await wrapper.findComponent({ name: 'PartySelector' }).vm.$emit('combat-created', { id: 'combat-1' });
    expect(router.push).toHaveBeenCalledWith('/combats/combat-1');
  });
}); 