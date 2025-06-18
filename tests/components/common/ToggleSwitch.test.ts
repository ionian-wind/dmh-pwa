import { mount } from '@vue/test-utils';
import ToggleSwitch from '@/components/common/ToggleSwitch.vue';

describe('ToggleSwitch', () => {
  it('renders with default props', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false }
    });
    expect(wrapper.classes()).toContain('toggle-container');
    expect(wrapper.find('button').exists()).toBe(true);
  });

  it('shows label if provided', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'Test Label' }
    });
    expect(wrapper.find('.toggle-label').text()).toBe('Test Label');
  });

  it('does not show label if not provided', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false }
    });
    expect(wrapper.find('.toggle-label').exists()).toBe(false);
  });

  it('renders and reflects modelValue', () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: true } });
    expect(wrapper.find('.toggle-switch').classes()).toContain('active');
  });

  it('emits update:modelValue when toggled', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false } });
    await wrapper.find('.toggle-switch').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
    expect(wrapper.emitted('update:modelValue')[0][0]).toBe(true);
  });

  it('does not emit when disabled', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, disabled: true } });
    await wrapper.find('.toggle-switch').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });

  it('renders label and toggles on label click', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false, label: 'Test Label' } });
    expect(wrapper.text()).toContain('Test Label');
    await wrapper.find('.toggle-label').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('toggles with keyboard (Enter/Space)', async () => {
    const wrapper = mount(ToggleSwitch, { props: { modelValue: false } });
    await wrapper.find('.toggle-switch').trigger('keydown', { key: 'Enter' });
    await wrapper.find('.toggle-switch').trigger('keydown', { key: ' ' });
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('has correct aria attributes', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: true, label: 'Switch label' }
    });
    const button = wrapper.find('button');
    expect(button.attributes('aria-checked')).toBe('true');
    expect(button.attributes('aria-label')).toBe('Switch label');
    expect(button.attributes('role')).toBe('switch');
  });

  it('is focusable and has correct tabindex', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false }
    });
    expect(wrapper.find('button').attributes('tabindex')).toBe('0');
  });

  it('applies disabled class and attribute when disabled', () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, disabled: true }
    });
    expect(wrapper.classes()).toContain('disabled');
    expect(wrapper.find('button').classes()).toContain('disabled');
    expect(wrapper.find('button').attributes('disabled')).toBeDefined();
  });

  it('clicking label toggles switch', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'Label' }
    });
    await wrapper.find('.toggle-label').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeTruthy();
  });

  it('does not toggle when disabled and label is clicked', async () => {
    const wrapper = mount(ToggleSwitch, {
      props: { modelValue: false, label: 'Label', disabled: true }
    });
    await wrapper.find('.toggle-label').trigger('click');
    expect(wrapper.emitted('update:modelValue')).toBeFalsy();
  });
}); 
}); 