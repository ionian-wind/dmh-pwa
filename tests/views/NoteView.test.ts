import { mount, flushPromises } from '@vue/test-utils';
import NoteView from '@/views/NoteView.vue';

jest.mock('@/components/NoteEditor.vue', () => ({
  __esModule: true,
  default: { name: 'NoteEditor', template: '<div />' }
}));
jest.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
jest.mock('@/utils/markdownParser', () => ({
  parseMarkdown: (content: string) => `<p>${content}</p>`
}));
jest.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    loadNotes: jest.fn(),
    getNoteById: (id: string) => id === 'n1' ? { id: 'n1', title: 'Test Note', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 } : null,
    updateNote: jest.fn(),
    deleteNote: jest.fn()
  })
}));
jest.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    loadModules: jest.fn(),
    getModuleName: jest.fn(() => 'Module Name')
  })
}));

const $route = { params: { id: 'n1' } };
const $router = { push: jest.fn() };

describe('NoteView', () => {
  it('renders note content and title', async () => {
    const wrapper = mount(NoteView, {
      global: {
        mocks: { $route, $router }
      }
    });
    await flushPromises();
    expect(wrapper.text()).toContain('Test Note');
    expect(wrapper.html()).toContain('<p>Content</p>');
  });

  it('shows editor when isEditing is true', async () => {
    const wrapper = mount(NoteView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleEdit();
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'NoteEditor' }).exists()).toBe(true);
  });

  it('calls updateNote and updates content on submit', async () => {
    const wrapper = mount(NoteView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    const note = { id: 'n1', title: 'Updated', content: 'Updated content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 };
    await wrapper.vm.handleSubmit(note);
    expect(wrapper.vm.note.title).toBe('Updated');
    expect(wrapper.vm.parsedContent).toBe('<p>Updated content</p>');
  });

  it('calls deleteNote on handleDelete', async () => {
    const wrapper = mount(NoteView, {
      global: { mocks: { $route, $router } }
    });
    await flushPromises();
    await wrapper.vm.handleDelete();
    // The mock store's deleteNote is a jest.fn()
    expect(require('@/stores/notes').useNoteStore().deleteNote).toHaveBeenCalledWith('n1');
  });

  it('sets notFound if note is missing', async () => {
    const missingRoute = { params: { id: 'missing' } };
    const wrapper = mount(NoteView, {
      global: { mocks: { $route: missingRoute, $router } }
    });
    await flushPromises();
    expect(wrapper.vm.notFound).toBe(true);
  });
}); 