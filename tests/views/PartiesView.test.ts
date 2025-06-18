import { mount, flushPromises } from '@vue/test-utils';
import PartiesView from '@/views/PartiesView.vue';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

// Mock PartyCard and PartyEditor
jest.mock('@/components/PartyCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'PartyCard',
    props: ['party'],
    emits: ['view', 'edit', 'delete'],
    template: '<div class="party-card">PartyCard</div>'
  }
}));
jest.mock('@/components/PartyEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'PartyEditor',
    props: ['party', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="party-editor">PartyEditor</div>'
  }
}));

// Mock store
jest.mock('@/stores/parties', () => {
  const parties = [
    { id: '1', name: 'Alpha', description: 'First', characters: ['a'], moduleIds: ['m1'], createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Beta', description: 'Second', characters: ['b'], moduleIds: ['m2'], createdAt: 0, updatedAt: 0 }
  ];
  return {
    usePartyStore: () => ({
      filteredParties: parties,
      loadParties: jest.fn(),
      createParty: jest.fn(),
      updateParty: jest.fn(),
      deleteParty: jest.fn()
    })
  };
});

describe('PartiesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(PartiesView);
    expect(wrapper.find('h1').text()).toBe('Parties');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no parties', async () => {
    jest.doMock('@/stores/parties', () => ({
      usePartyStore: () => ({ filteredParties: [], loadParties: jest.fn(), createParty: jest.fn(), updateParty: jest.fn(), deleteParty: jest.fn() })
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
    window.confirm = jest.fn(() => true);
    const wrapper = mount(PartiesView);
    const store = require('@/stores/parties').usePartyStore();
    await wrapper.findAllComponents({ name: 'PartyCard' })[0].vm.$emit('delete', { id: '1', name: 'Alpha' });
    expect(store.deleteParty).toHaveBeenCalledWith('1');
  });
}); 