import { mount } from '@vue/test-utils';
import Button from '@/components/common/Button.vue';

describe('Button', () => {
  it('renders slot content', () => {
    const wrapper = mount(Button, { slots: { default: 'Click Me' } });
    expect(wrapper.text()).toContain('Click Me');
  });

  it('applies variant and size classes', () => {
    const wrapper = mount(Button, { props: { variant: 'danger', size: 'large' }, slots: { default: 'Danger' } });
    expect(wrapper.classes()).toContain('btn--danger');
    expect(wrapper.classes()).toContain('btn--large');
  });

  it('emits click when clicked and not disabled/loading', async () => {
    const wrapper = mount(Button, { slots: { default: 'Click' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(Button, { props: { disabled: true }, slots: { default: 'Disabled' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
    expect(wrapper.classes()).toContain('btn--disabled');
  });

  it('does not emit click when loading', async () => {
    const wrapper = mount(Button, { props: { loading: true }, slots: { default: 'Loading' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
    expect(wrapper.classes()).toContain('btn--disabled');
    expect(wrapper.find('.btn__loading').exists()).toBe(true);
  });
}); 