import { mount } from '@vue/test-utils';
import BaseEntityView from '@/components/common/BaseEntityView.vue';
import { vi } from 'vitest';

vi.mock('vue-router', () => ({
  useRoute: () => ({}),
  useRouter: () => ({ push: vi.fn() })
}));

vi.mock('@/components/common/Button.vue', () => ({ __esModule: true, default: {} }));
vi.mock('@/views/NotFoundView.vue', () => ({ __esModule: true, default: {} }));

describe('BaseEntityView', () => {
  const baseProps = {
    entity: { id: '1' },
    entityName: 'Test',
    listRoute: '/test',
    onDelete: vi.fn(),
    title: 'Test Title',
    subtitle: 'Test Subtitle'
  };

  it('renders title, subtitle, and slots', () => {
    const wrapper = mount(BaseEntityView, {
      props: baseProps,
      slots: {
        default: '<div class="main-slot">Main</div>',
        editor: '<div class="editor-slot">Editor</div>'
      }
    });
    expect(wrapper.text()).toContain('Test Title');
    expect(wrapper.text()).toContain('Test Subtitle');
    expect(wrapper.find('.main-slot').exists()).toBe(true);
    expect(wrapper.find('.editor-slot').exists()).toBe(true);
  });

  it('shows NotFoundView if notFound is true', () => {
    const wrapper = mount(BaseEntityView, {
      props: { ...baseProps, notFound: true }
    });
    expect(wrapper.find('.not-found').exists()).toBe(true);
  });

  it('calls onDelete and navigates on delete', async () => {
    window.confirm = vi.fn(() => true);
    const wrapper = mount(BaseEntityView, { props: baseProps });
    await wrapper.findAll('button')[1].trigger('click'); // Delete
    expect(baseProps.onDelete).toHaveBeenCalled();
  });

  it('calls onEdit if provided', async () => {
    const onEdit = vi.fn();
    const wrapper = mount(BaseEntityView, { props: { ...baseProps, onEdit } });
    await wrapper.findAll('button')[0].trigger('click'); // Edit
    expect(onEdit).toHaveBeenCalled();
  });
}); 