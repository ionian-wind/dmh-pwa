import { mount, flushPromises } from '@vue/test-utils';
import CharactersView from '@/views/CharactersView.vue';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

// Mock CharacterCard and CharacterEditor
jest.mock('@/components/CharacterCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'CharacterCard',
    props: ['character'],
    emits: ['view', 'edit', 'delete'],
    template: '<div class="character-card">CharacterCard</div>'
  }
}));
jest.mock('@/components/CharacterEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'CharacterEditor',
    props: ['character', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="character-editor">CharacterEditor</div>'
  }
}));

// Mock store
jest.mock('@/stores/characters', () => {
  const characters = [
    { id: '1', name: 'Alice', class: 'Wizard', level: 3, race: 'Elf', playerName: 'A', stats: { strength: 8, dexterity: 14, constitution: 12, intelligence: 18, wisdom: 10, charisma: 13 }, hitPoints: { maximum: 20, current: 15 }, armorClass: 12, initiative: 2, speed: 30, proficiencies: [], equipment: [], createdAt: 0, updatedAt: 0 },
    { id: '2', name: 'Bob', class: 'Fighter', level: 2, race: 'Human', playerName: 'B', stats: { strength: 16, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 10, charisma: 8 }, hitPoints: { maximum: 25, current: 25 }, armorClass: 16, initiative: 1, speed: 30, proficiencies: [], equipment: [], createdAt: 0, updatedAt: 0 }
  ];
  return {
    useCharacterStore: () => ({
      all: characters,
      add: jest.fn(),
      update: jest.fn(),
      remove: jest.fn()
    })
  };
});
jest.mock('@/stores/parties', () => ({ usePartyStore: () => ({ loadParties: jest.fn() }) }));
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ loadModules: jest.fn() }) }));

describe('CharactersView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it('renders header and create button', () => {
    const wrapper = mount(CharactersView);
    expect(wrapper.find('h1').text()).toBe('Characters');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no characters', async () => {
    jest.doMock('@/stores/characters', () => ({
      useCharacterStore: () => ({ all: [], add: jest.fn(), update: jest.fn(), remove: jest.fn() })
    }));
    const wrapper = mount(CharactersView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No characters yet');
  });

  it('shows characters grid if characters exist', () => {
    const wrapper = mount(CharactersView);
    expect(wrapper.find('.characters-grid').exists()).toBe(true);
    expect(wrapper.findAll('.character-card').length).toBeGreaterThan(0);
  });

  it('opens editor when create button is clicked', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from CharacterCard', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findAllComponents({ name: 'CharacterCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(false);
  });

  it('calls store add on submit if no id', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('submit', { name: 'New', id: undefined });
    expect(store.add).toHaveBeenCalled();
  });

  it('calls store update on submit if id exists', async () => {
    const wrapper = mount(CharactersView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findComponent({ name: 'CharacterEditor' }).vm.$emit('submit', { name: 'Edit', id: '1' });
    expect(store.update).toHaveBeenCalled();
  });

  it('calls store remove on delete event', async () => {
    window.confirm = jest.fn(() => true);
    const wrapper = mount(CharactersView);
    const store = require('@/stores/characters').useCharacterStore();
    await wrapper.findAllComponents({ name: 'CharacterCard' })[0].vm.$emit('delete', { id: '1', name: 'Alice' });
    expect(store.remove).toHaveBeenCalledWith('1');
  });
}); 