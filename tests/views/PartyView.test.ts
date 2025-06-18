import { mount, flushPromises } from '@vue/test-utils';
import PartyView from '@/views/PartyView.vue';

jest.mock('@/components/PartyEditor.vue', () => ({
  __esModule: true,
  default: { name: 'PartyEditor', template: '<div />' }
}));
jest.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
jest.mock('@/components/common/BaseModal.vue', () => ({
  __esModule: true,
  default: { name: 'BaseModal', template: '<div><slot /></div>' }
}));
jest.mock('@/components/common/ToggleSwitch.vue', () => ({
  __esModule: true,
  default: { name: 'ToggleSwitch', template: '<div />' }
}));
jest.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: { name: 'Button', template: '<button><slot /></button>' }
}));
jest.mock('@/stores/parties', () => ({
  usePartyStore: () => ({
    getPartyById: (id: string) => id === 'p1' ? { id: 'p1', name: 'Test Party', moduleIds: [], createdAt: 0, updatedAt: 0 } : null,
    deleteParty: jest.fn(),
    updateParty: jest.fn()
  })
}));
jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ getModuleById: jest.fn(() => ({ id: 'mod-1', name: 'Module One' })) })
}));
jest.mock('@/stores/characters', () => ({
  useCharacterStore: () => ({
    all: [
      { id: 'c1', name: 'Alice', partyId: 'p1', level: 2, class: 'Wizard' },
      { id: 'c2', name: 'Bob', partyId: null, level: 1, class: 'Fighter' }
    ],
    setParty: jest.fn()
  })
}));

const $route = { params: { id: 'p1' } };
const $router = { push: jest.fn() };

describe('PartyView', () => {
  it('renders party content and title', async () => {
    const wrapper = mount(PartyView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Test Party');
    expect(wrapper.text()).toContain('Characters');
  });

  it('shows editor when showEditor is true', async () => {
    const wrapper = mount(PartyView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    wrapper.vm.showEditor = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'PartyEditor' }).exists()).toBe(true);
  });

  it('calls updateParty and updates party on submit', async () => {
    const wrapper = mount(PartyView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const updated = { name: 'Updated Party', moduleIds: [], createdAt: 0, updatedAt: 0 };
    await wrapper.vm.handlePartySubmit(updated);
    expect(wrapper.vm.party.name).toBe('Updated Party');
  });

  it('calls deleteParty on handleDeleteParty', async () => {
    const wrapper = mount(PartyView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDeleteParty();
    expect(require('@/stores/parties').usePartyStore().deleteParty).toHaveBeenCalledWith('p1');
  });

  it('handles character linking and unlinking', async () => {
    const wrapper = mount(PartyView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const character = { id: 'c1', name: 'Alice', partyId: 'p1', level: 2, class: 'Wizard' };
    await wrapper.vm.handleToggleCharacter(character, false);
    expect(require('@/stores/characters').useCharacterStore().setParty).toHaveBeenCalledWith('c1', null);
    await wrapper.vm.handleToggleCharacter(character, true);
    expect(require('@/stores/characters').useCharacterStore().setParty).toHaveBeenCalledWith('c1', 'p1');
  });

  it('sets notFound if party is missing', async () => {
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(PartyView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });
}); 