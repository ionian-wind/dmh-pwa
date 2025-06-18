import { mount } from '@vue/test-utils';
import MonsterCard from '@/components/MonsterCard.vue';

jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ getModuleName: jest.fn(() => 'Test Module') })
}));

describe('MonsterCard', () => {
  const monster = {
    id: 'm1',
    name: 'Goblin',
    type: 'Humanoid',
    challengeRating: 1,
    size: 'Small',
    alignment: 'Chaotic Evil',
    abilities: {
      strength: 8,
      dexterity: 14,
      constitution: 10,
      intelligence: 10,
      wisdom: 8,
      charisma: 8
    },
    hitPoints: 7,
    armorClass: 13,
    speed: { walk: 30 },
    xp: 50,
    moduleId: 'mod-1',
    createdAt: 0,
    updatedAt: 0
  };

  it('renders monster name, type, stats, and module', () => {
    const wrapper = mount(MonsterCard, { props: { monster } });
    expect(wrapper.text()).toContain('Goblin');
    expect(wrapper.text()).toContain('Humanoid');
    expect(wrapper.text()).toContain('Test Module');
    expect(wrapper.text()).toContain('STR');
    expect(wrapper.text()).toContain('DEX');
    expect(wrapper.text()).toContain('CHA');
    expect(wrapper.text()).toContain('7');
    expect(wrapper.text()).toContain('13');
    expect(wrapper.text()).toContain('30ft');
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(MonsterCard, { props: { monster, showActions: true } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(monster);
    expect(wrapper.emitted('edit')[0][0]).toEqual(monster);
    expect(wrapper.emitted('delete')[0][0]).toEqual(monster.id);
  });
}); 