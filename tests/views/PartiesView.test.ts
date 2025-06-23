import { mount, flushPromises } from '@vue/test-utils';
import PartiesView from '@/views/PartiesView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock PartyCard and PartyEditor
vi.mock('@/components/PartyCard.vue', () => ({}));
vi.mock('@/components/PartyEditor.vue', () => ({}));

// Mock store
vi.mock('@/stores/parties', () => ({}));
vi.mock('@/stores/characters', () => ({}));
vi.mock('@/stores/combats', () => ({}));
vi.mock('@/stores/encounters', () => ({}));

describe('PartiesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(PartiesView);
    expect(wrapper.find('h1').text()).toBe('Parties');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no parties', async () => {
    vi.doMock('@/stores/parties', () => ({
      usePartyStore: () => ({ filteredParties: [], loadParties: vi.fn(), createParty: vi.fn(), updateParty: vi.fn(), deleteParty: vi.fn() })
    }));
    const wrapper = mount(PartiesView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No parties yet');
  });

  it('shows parties grid if parties exist', () => {
    const wrapper = mount(PartiesView);
    expect(wrapper.find('.parties-grid').exists()).toBe(true);
    expect(wrapper.findAll('.party-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(PartiesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'PartyEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from PartyCard', async () => {
    const wrapper = mount(PartiesView);
    await wrapper.findAllComponents({ name: 'PartyCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartyEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(PartiesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'PartyEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartyEditor' }).exists()).toBe(false);
  });

  it('calls store createParty on submit if no id', async () => {
    const wrapper = mount(PartiesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/parties').usePartyStore();
    await wrapper.findComponent({ name: 'PartyEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.createParty).toHaveBeenCalled();
  });

  it('calls store updateParty on submit if id exists', async () => {
    const wrapper = mount(PartiesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/parties').usePartyStore();
    await wrapper.findComponent({ name: 'PartyEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.updateParty).toHaveBeenCalled();
  });

  it('calls store deleteParty on delete event', async () => {
    window.confirm = vi.fn(() => true);
    const wrapper = mount(PartiesView);
    const store = require('@/stores/parties').usePartyStore();
    await wrapper.findAllComponents({ name: 'PartyCard' })[0].vm.$emit('delete', { id: '1', name: 'Alpha' });
    expect(store.deleteParty).toHaveBeenCalledWith('1');
  });
}); 