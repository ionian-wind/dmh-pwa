import { mount, flushPromises } from '@vue/test-utils';
import EncountersView from '../../src/encounters/EncountersView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock EncounterCard, EncounterEditor, PartySelector
vi.mock('@/components/EncounterCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'EncounterCard',
    props: ['encounter'],
    emits: ['view', 'edit', 'delete', 'run-combat'],
    template: '<div class="encounter-card">EncounterCard</div>'
  }
}));
vi.mock('@/components/EncounterEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'EncounterEditor',
    props: ['encounter', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="encounter-editor">EncounterEditor</div>'
  }
}));
vi.mock('@/components/PartySelector.vue', () => ({
  __esModule: true,
  default: {
    name: 'PartySelector',
    props: ['isOpen', 'encounter'],
    emits: ['cancel', 'combat-created'],
    template: '<div class="party-selector">PartySelector</div>'
  }
}));

// Mock store
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    filteredEncounters: [],
    loadEncounters: vi.fn(),
    createEncounter: vi.fn(),
    updateEncounter: vi.fn(),
    deleteEncounter: vi.fn()
  })
}));
vi.mock('@/stores/modules', () => ({ useModuleStore: () => ({ modules: [] }) }));

describe('EncountersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(EncountersView);
    expect(wrapper.find('h1').text()).toBe('Encounters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no encounters', async () => {
    vi.doMock('@/stores/encounters', () => ({
      useEncounterStore: () => ({ filteredEncounters: [], loadEncounters: vi.fn(), createEncounter: vi.fn(), updateEncounter: vi.fn(), deleteEncounter: vi.fn() })
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
    window.confirm = vi.fn(() => true);
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
