import { mount, flushPromises } from '@vue/test-utils';
import CharacterView from '@/views/CharacterView.vue';

jest.mock('@/components/CharacterEditor.vue', () => ({
  __esModule: true,
  default: { name: 'CharacterEditor', template: '<div />' }
}));
jest.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
jest.mock('@/stores/characters', () => ({
  useCharacterStore: () => ({
    getById: (id: string) => id === 'c1' ? { id: 'c1', name: 'Alice', playerName: 'Player', background: 'Sage', level: 2, class: 'Wizard', stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 18, wisdom: 8, charisma: 8 }, armorClass: 13, speed: 30, hitPoints: { current: 10, maximum: 12, temporary: 2 }, proficiencies: ['Arcana'], equipment: ['Staff'], spells: ['Magic Missile'], features: ['Spellcasting'], notes: 'Some notes', createdAt: 0, updatedAt: 0 }, remove: jest.fn(), update: jest.fn() } : null,
    remove: jest.fn(),
    update: jest.fn()
  })
}));

const $route = { params: { id: 'c1' } };
const $router = { push: jest.fn() };

describe('CharacterView', () => {
  it('renders character content and title', async () => {
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Alice');
    expect(wrapper.text()).toContain('Player');
    expect(wrapper.text()).toContain('Sage');
  });

  it('shows editor when showEditor is true', async () => {
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    wrapper.vm.showEditor = true;
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'CharacterEditor' }).exists()).toBe(true);
  });

  it('calls update and updates character on handleSave', async () => {
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const updated = { ...wrapper.vm.character, name: 'Bob' };
    await wrapper.vm.handleSave(updated);
    expect(wrapper.vm.character.name).toBe('Bob');
  });

  it('calls remove on handleDelete', async () => {
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDelete();
    expect(require('@/stores/characters').useCharacterStore().remove).toHaveBeenCalledWith('c1');
  });

  it('sets notFound if character is missing', async () => {
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });

  it('abilityModifier and formatModifier helpers work', () => {
    const wrapper = mount(CharacterView, {
      global: { mocks: { $route, $router } }
    });
    expect(wrapper.vm.abilityModifier(14)).toBe(2);
    expect(wrapper.vm.formatModifier(2)).toBe('+2');
    expect(wrapper.vm.formatModifier(-1)).toBe('-1');
  });
}); 