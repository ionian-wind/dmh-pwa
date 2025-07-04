import { mount } from '@vue/test-utils';
import EncounterEditor from '../../src/encounters/EncounterEditor.vue';
import { vi } from 'vitest';

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ modules: [
    { id: 'mod-1', name: 'Module One' },
    { id: 'mod-2', name: 'Module Two' },
    ], currentModuleFilter: 'mod-1' })
}));
vi.mock('@/components/ModuleSelector.vue', () => ({
  __esModule: true,
  default: {
    name: 'ModuleSelector',
    props: ['modelValue', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<select><option value="mod-1">Module One</option><option value="mod-2">Module Two</option></select>'
  }
}));

describe('EncounterEditor', () => {
  const baseProps = { isOpen: true, encounter: null };

  it('renders create form when no encounter is passed', () => {
    const wrapper = mount(EncounterEditor, { props: baseProps });
    expect(wrapper.text()).toContain('Add Encounter');
    expect(wrapper.find('input').exists()).toBe(true);
  });

  it('renders edit form when encounter is passed', () => {
    const encounter = { name: 'Edit Me', description: 'desc', difficulty: 'easy', level: 1, xp: 0, monsters: {}, currentRound: 0, currentTurn: 0, moduleId: 'mod-1', notes: '', createdAt: 0, updatedAt: 0 };
    const wrapper = mount(EncounterEditor, { props: { ...baseProps, encounter } });
    expect(wrapper.text()).toContain('Edit Encounter');
    expect(wrapper.find('input').element.value).toBe('Edit Me');
  });

  it('shows module options', () => {
    const wrapper = mount(EncounterEditor, { props: baseProps });
    const options = wrapper.findAll('select option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[0].text()).toContain('Module One');
  });

  it('emits submit with form data', async () => {
    const wrapper = mount(EncounterEditor, { props: baseProps });
    await wrapper.find('input').setValue('New Encounter');
    await wrapper.find('select').setValue('mod-1');
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].name).toBe('New Encounter');
  });

  it('shows alert if name is missing on submit', async () => {
    window.alert = vi.fn();
    const wrapper = mount(EncounterEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalledWith('Name is required');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('shows alert if module is missing on submit', async () => {
    window.alert = vi.fn();
    const wrapper = mount(EncounterEditor, { props: baseProps });
    await wrapper.find('input').setValue('Name');
    wrapper.vm.editedEncounter.moduleId = '';
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalledWith('Module is required');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits cancel when cancel is clicked', async () => {
    const wrapper = mount(EncounterEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });
}); 
