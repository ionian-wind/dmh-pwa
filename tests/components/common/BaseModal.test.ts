import { mount } from '@vue/test-utils';
import BaseModal from '@/components/common/BaseModal.vue';

jest.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: {
    name: 'Button',
    template: '<button><slot /></button>'
  }
}));
jest.mock('@/composables/useModalState', () => ({ useModalState: () => ({ openModal: jest.fn(), closeModal: jest.fn() }) }));

describe('BaseModal', () => {
  const baseProps = { isOpen: true, title: 'Test Modal', showSubmit: true, showCancel: true };

  it('renders title and slots', () => {
    const wrapper = mount(BaseModal, {
      props: baseProps,
      slots: { default: '<div class="modal-content">Content</div>', actions: '<div class="modal-actions-slot">Actions</div>' }
    });
    expect(wrapper.text()).toContain('Test Modal');
    expect(wrapper.find('.modal-content').exists()).toBe(true);
    expect(wrapper.find('.modal-actions-slot').exists()).toBe(true);
  });

  it('emits submit and cancel events', async () => {
    const wrapper = mount(BaseModal, { props: baseProps });
    await wrapper.findAll('button')[0].trigger('click'); // Cancel
    await wrapper.findAll('button')[1].trigger('click'); // Submit
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('submit')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const wrapper = mount(BaseModal, { props: { ...baseProps, isOpen: false } });
    expect(wrapper.html()).toBe('');
  });

  it('handles Escape key to emit cancel', async () => {
    const wrapper = mount(BaseModal, { props: baseProps });
    const event = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(event);
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });
}); 