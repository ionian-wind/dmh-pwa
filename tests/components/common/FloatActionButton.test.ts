import { mount } from '@vue/test-utils';
import FloatActionButton from '@/components/common/FloatActionButton.vue';
import { vi } from 'vitest';

vi.mock('@/composables/useModalState', () => ({ useModalState: () => ({ isModalOpen: { value: false } }) }));

describe('FloatActionButton', () => {
  it('renders slot content and applies classes', () => {
    const wrapper = mount(FloatActionButton, { slots: { default: 'FAB' } });
    expect(wrapper.text()).toContain('FAB');
    expect(wrapper.classes()).toContain('float-action-button');
  });

  it('emits click when clicked and not disabled', async () => {
    const wrapper = mount(FloatActionButton, { slots: { default: 'FAB' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeTruthy();
  });

  it('does not emit click when disabled', async () => {
    const wrapper = mount(FloatActionButton, { props: { disabled: true }, slots: { default: 'FAB' } });
    await wrapper.trigger('click');
    expect(wrapper.emitted('click')).toBeFalsy();
    expect(wrapper.classes()).toContain('float-action-button--disabled');
  });

  it('is hidden when hideOnModal and modal is open', () => {
    vi.mock('@/composables/useModalState', () => ({ useModalState: () => ({ isModalOpen: { value: true } }) }));
    const wrapper = mount(FloatActionButton, { props: { hideOnModal: true }, slots: { default: 'FAB' } });
    expect(wrapper.classes()).toContain('float-action-button--hidden');
  });
}); 