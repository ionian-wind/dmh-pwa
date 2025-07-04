import { mount } from '@vue/test-utils';
import CharacterEditor from '../../src/characters/CharacterEditor.vue';
import { vi } from 'vitest';

describe('CharacterEditor', () => {
  const baseProps = { isOpen: true };

  it('renders create form when no character is passed', () => {
    const wrapper = mount(CharacterEditor, { props: baseProps });
    expect(wrapper.text()).toContain('Create Character');
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('renders edit form when character is passed', () => {
    const character = { id: 'c1', name: 'Alice', class: 'Wizard', race: 'Elf', level: 2, playerName: 'Bob', alignment: 'NG', background: 'Sage', stats: { strength: 10, dexterity: 12, constitution: 14, intelligence: 16, wisdom: 8, charisma: 10 }, hitPoints: { maximum: 12, current: 10, temporary: 0 }, armorClass: 13, initiative: 2, speed: 30, proficiencies: [], equipment: [], spells: [], features: [], notes: '', createdAt: 0, updatedAt: 0 };
    const wrapper = mount(CharacterEditor, { props: { ...baseProps, character } });
    expect(wrapper.text()).toContain('Edit Character');
    expect(wrapper.find('input').element.value).toBe('Bob');
  });

  it('emits submit with form data', async () => {
    const wrapper = mount(CharacterEditor, { props: baseProps });
    await wrapper.findAll('input')[1].setValue('Alice');
    await wrapper.findAll('input')[3].setValue('Wizard');
    await wrapper.findAll('input')[4].setValue('Elf');
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].name).toBe('Alice');
  });

  it('shows alert if required fields are missing on submit', async () => {
    window.alert = vi.fn();
    const wrapper = mount(CharacterEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits cancel when cancel is clicked', async () => {
    const wrapper = mount(CharacterEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('shows correct stat modifiers', () => {
    const character = { id: 'c1', name: 'Alice', class: 'Wizard', race: 'Elf', level: 2, playerName: 'Bob', alignment: 'NG', background: 'Sage', stats: { strength: 10, dexterity: 12, constitution: 14, intelligence: 16, wisdom: 8, charisma: 10 }, hitPoints: { maximum: 12, current: 10, temporary: 0 }, armorClass: 13, initiative: 2, speed: 30, proficiencies: [], equipment: [], spells: [], features: [], notes: '', createdAt: 0, updatedAt: 0 };
    const wrapper = mount(CharacterEditor, { props: { ...baseProps, character } });
    expect(wrapper.text()).toContain('+0');
    expect(wrapper.text()).toContain('+1');
    expect(wrapper.text()).toContain('+3');
    expect(wrapper.text()).toContain('-1');
  });
}); 
