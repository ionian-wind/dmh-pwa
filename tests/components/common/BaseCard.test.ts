import { mount } from '@vue/test-utils';
import BaseCard from '@/components/common/BaseCard.vue';

// Mock Button to avoid deep rendering
jest.mock('@/components/common/Button.vue', () => ({
  __esModule: true,
  default: {
    name: 'Button',
    template: '<button><slot /></button>'
  }
}));

describe('BaseCard', () => {
  it('renders slots', () => {
    const wrapper = mount(BaseCard, {
      slots: {
        header: '<div class="header-slot">Header</div>',
        default: '<div class="content-slot">Content</div>',
        actions: '<div class="actions-slot">Actions</div>'
      }
    });
    expect(wrapper.find('.header-slot').exists()).toBe(true);
    expect(wrapper.find('.content-slot').exists()).toBe(true);
    expect(wrapper.find('.actions-slot').exists()).toBe(true);
  });

  it('shows view, edit, and delete buttons when props are true', () => {
    const wrapper = mount(BaseCard, {
      props: { showView: true, showEdit: true, showDelete: true }
    });
    expect(wrapper.text()).toContain('View Details');
    expect(wrapper.text()).toContain('✏️');
    expect(wrapper.text()).toContain('🗑️');
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(BaseCard, {
      props: { showView: true, showEdit: true, showDelete: true }
    });
    await wrapper.findAll('button')[0].trigger('click'); // View
    await wrapper.findAll('button')[1].trigger('click'); // Edit
    await wrapper.findAll('button')[2].trigger('click'); // Delete
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
  });
}); 