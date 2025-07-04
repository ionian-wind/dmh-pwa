import { mount } from '@vue/test-utils';
import PartyEditor from '../../src/parties/PartyEditor.vue';
import { vi } from 'vitest';

vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({ modules: [
    { id: 'mod-1', name: 'Module One' },
    { id: 'mod-2', name: 'Module Two' }
  ] })
}));

window.alert = vi.fn();

describe('PartyEditor', () => {
  const baseProps = { isOpen: true, party: null };

  it('renders create form when no party is passed', () => {
    const wrapper = mount(PartyEditor, { props: baseProps });
    expect(wrapper.text()).toContain('Create Party');
    expect(wrapper.find('input#name').exists()).toBe(true);
  });

  it('renders edit form when party is passed', () => {
    const party = { name: 'Edit Me', description: 'desc', notes: 'n', characters: [], moduleIds: ['mod-1'] };
    const wrapper = mount(PartyEditor, { props: { ...baseProps, party } });
    expect(wrapper.text()).toContain('Edit Party');
    expect(wrapper.find('input#name').element.value).toBe('Edit Me');
  });

  it('shows module options', () => {
    const wrapper = mount(PartyEditor, { props: baseProps });
    const options = wrapper.findAll('select#module option');
    expect(options.length).toBeGreaterThan(1);
    expect(options[1].text()).toContain('Module One');
  });

  it('emits submit with form data', async () => {
    const wrapper = mount(PartyEditor, { props: baseProps });
    await wrapper.find('input#name').setValue('New Party');
    await wrapper.find('textarea#description').setValue('desc');
    await wrapper.find('select#module').setValue(['mod-1']);
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].name).toBe('New Party');
  });

  it('shows alert if name is missing on submit', async () => {
    const wrapper = mount(PartyEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalledWith('Name is required');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits cancel when cancel is clicked', async () => {
    const wrapper = mount(PartyEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });
}); 
