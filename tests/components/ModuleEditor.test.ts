import { mount } from '@vue/test-utils';
import ModuleEditor from '@/components/ModuleEditor.vue';
import { vi } from 'vitest';

describe('ModuleEditor', () => {
  const baseProps = { isOpen: true, module: null };

  it('renders create form when no module is passed', () => {
    const wrapper = mount(ModuleEditor, { props: baseProps });
    expect(wrapper.text()).toContain('Create Module');
    expect(wrapper.find('input#name').exists()).toBe(true);
  });

  it('renders edit form when module is passed', () => {
    const mod = { name: 'Edit Me', description: 'desc', id: 'm1', createdAt: 0, updatedAt: 0 };
    const wrapper = mount(ModuleEditor, { props: { ...baseProps, module: mod } });
    expect(wrapper.text()).toContain('Edit Module');
    expect(wrapper.find('input#name').element.value).toBe('Edit Me');
  });

  it('emits submit with form data', async () => {
    const wrapper = mount(ModuleEditor, { props: baseProps });
    await wrapper.find('input#name').setValue('New Module');
    await wrapper.find('textarea#description').setValue('desc');
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(wrapper.emitted('submit')).toBeTruthy();
    expect(wrapper.emitted('submit')[0][0].name).toBe('New Module');
  });

  it('shows alert if name is missing on submit', async () => {
    window.alert = vi.fn();
    const wrapper = mount(ModuleEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('submit');
    expect(window.alert).toHaveBeenCalledWith('Name is required');
    expect(wrapper.emitted('submit')).toBeFalsy();
  });

  it('emits cancel when cancel is clicked', async () => {
    const wrapper = mount(ModuleEditor, { props: baseProps });
    await wrapper.findComponent({ name: 'BaseModal' }).vm.$emit('cancel');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });
}); 