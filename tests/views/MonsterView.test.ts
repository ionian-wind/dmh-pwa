import { mount, flushPromises } from '@vue/test-utils';
import MonsterView from '@/views/MonsterView.vue';
import { vi } from 'vitest';

vi.mock('@/components/MonsterEditor.vue', () => ({
  __esModule: true,
  default: { name: 'MonsterEditor', template: '<div />' }
}));
vi.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => ({
    loadMonsters: vi.fn(),
    monsters: [
      { id: 'm1', name: 'Goblin', type: 'Humanoid', size: 'Small', alignment: 'Chaotic Evil', challengeRating: 1, armorClass: 13, hitPoints: 7, speed: { walk: 30 }, stats: { strength: 8, dexterity: 14, constitution: 10, intelligence: 10, wisdom: 8, charisma: 8 }, savingThrows: {}, skills: {}, damageVulnerabilities: [], damageResistances: [], damageImmunities: [], conditionImmunities: [], senses: [], languages: ['Common'], xp: 50, specialAbilities: [], actions: [], legendaryActions: [], description: '', moduleId: 'mod-1', createdAt: 0, updatedAt: 0 }
    ],
    updateMonster: vi.fn(),
    deleteMonster: vi.fn()
  })
}));
vi.mock('@/stores/notes', () => ({}));
vi.mock('@/stores/encounters', () => ({}));

const $route = { params: { id: 'm1' } };
const $router = { push: vi.fn() };

describe('MonsterView', () => {
  it('renders monster content and title', async () => {
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Goblin');
    expect(wrapper.text()).toContain('Humanoid');
    expect(wrapper.text()).toContain('Small');
  });

  it('shows editor when showEditor is true', async () => {
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleEditClick();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'MonsterEditor' }).exists()).toBe(true);
  });

  it('calls updateMonster and updates monster on submit', async () => {
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const updated = { ...wrapper.vm.monster, name: 'Orc' };
    await wrapper.vm.handleSubmit(updated);
    expect(wrapper.vm.monster.name).toBe('Orc');
  });

  it('calls deleteMonster on handleDelete', async () => {
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDelete();
    expect(require('@/stores/monsters').useMonsterStore().deleteMonster).toHaveBeenCalledWith('m1');
  });

  it('sets notFound if monster is missing', async () => {
    vi.mock('@/stores/monsters', () => ({
      useMonsterStore: () => ({ loadMonsters: vi.fn(), monsters: [], updateMonster: vi.fn(), deleteMonster: vi.fn() })
    }));
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });

  it('abilityModifier and formatModifier helpers work', () => {
    const wrapper = mount(MonsterView, {
      global: { mocks: { $route, $router } }
    });
    expect(wrapper.vm.abilityModifier(14)).toBe(2);
    expect(wrapper.vm.formatModifier(2)).toBe('+2');
    expect(wrapper.vm.formatModifier(-1)).toBe('-1');
  });
}); 