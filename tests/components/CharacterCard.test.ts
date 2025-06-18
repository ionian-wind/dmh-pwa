import { mount } from '@vue/test-utils';
import CharacterCard from '@/components/CharacterCard.vue';

const mockCharacter = {
  id: 'char-1',
  name: 'Test Character',
  level: 3,
  class: 'Wizard',
  race: 'Elf',
  playerName: 'Alice',
  stats: {
    strength: 8,
    dexterity: 14,
    constitution: 12,
    intelligence: 18,
    wisdom: 10,
    charisma: 13
  },
  hitPoints: { maximum: 20, current: 15, temporary: 5 },
  armorClass: 12,
  initiative: 2,
  speed: 30,
  proficiencies: ['Arcana', 'History'],
  equipment: ['Staff', 'Spellbook'],
  createdAt: 0,
  updatedAt: 0
};

describe('CharacterCard', () => {
  it('renders character name, class, race, and level', () => {
    const wrapper = mount(CharacterCard, { props: { character: mockCharacter } });
    expect(wrapper.text()).toContain('Test Character');
    expect(wrapper.text()).toContain('3 Wizard');
    expect(wrapper.text()).toContain('Elf');
  });

  it('renders all stats and modifiers', () => {
    const wrapper = mount(CharacterCard, { props: { character: mockCharacter } });
    const statBlocks = wrapper.findAll('.stat-block');
    expect(statBlocks).toHaveLength(6);
    expect(statBlocks[0].text()).toContain('STR');
    expect(statBlocks[0].text()).toContain('8');
    expect(statBlocks[0].text()).toContain('-1');
    expect(statBlocks[3].text()).toContain('INT');
    expect(statBlocks[3].text()).toContain('18');
    expect(statBlocks[3].text()).toContain('+4');
  });

  it('renders HP, AC, Speed, and temp HP', () => {
    const wrapper = mount(CharacterCard, { props: { character: mockCharacter } });
    expect(wrapper.text()).toContain('15/20');
    expect(wrapper.text()).toContain('+5 temp');
    expect(wrapper.text()).toContain('AC:');
    expect(wrapper.text()).toContain('12');
    expect(wrapper.text()).toContain('Speed:');
    expect(wrapper.text()).toContain('30ft');
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(CharacterCard, { props: { character: mockCharacter } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(mockCharacter);
    expect(wrapper.emitted('edit')[0][0]).toEqual(mockCharacter);
    expect(wrapper.emitted('delete')[0][0]).toEqual(mockCharacter);
  });

  it('formats positive and negative modifiers correctly', () => {
    const wrapper = mount(CharacterCard, { props: { character: mockCharacter } });
    // STR 8 => -1, INT 18 => +4
    expect(wrapper.text()).toContain('-1');
    expect(wrapper.text()).toContain('+4');
  });
}); 