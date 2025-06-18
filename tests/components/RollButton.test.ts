import { mount } from '@vue/test-utils';
import RollButton from '@/components/RollButton.vue';

jest.mock('@/components/common/FloatActionButton.vue', () => ({
  __esModule: true,
  default: {
    name: 'FloatActionButton',
    props: ['position', 'size', 'variant', 'disabled', 'hideOnModal'],
    emits: ['click'],
    template: '<button class="fab-mock" @click="$emit(\'click\', $event)"><slot /></button>'
  }
}));

describe('RollButton', () => {
  it('renders FloatActionButton and slot', () => {
    const wrapper = mount(RollButton);
    expect(wrapper.find('.fab-mock').exists()).toBe(true);
    expect(wrapper.text()).toContain('🎲');
  });

  it('passes props to FloatActionButton', () => {
    const wrapper = mount(RollButton, { props: { position: 'top-left', size: 'large', variant: 'danger', disabled: true, hideOnModal: false } });
    const fab = wrapper.findComponent({ name: 'FloatActionButton' });
    expect(fab.props('position')).toBe('top-left');
    expect(fab.props('size')).toBe('large');
    expect(fab.props('variant')).toBe('danger');
    expect(fab.props('disabled')).toBe(true);
    expect(fab.props('hideOnModal')).toBe(false);
  });

  it('emits click event when clicked', async () => {
    const wrapper = mount(RollButton);
    await wrapper.find('.fab-mock').trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });
}); 