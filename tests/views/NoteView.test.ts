import { mount, flushPromises } from '@vue/test-utils';
import NoteView from '../../src/notes/NoteView.vue';
import { vi } from 'vitest';

vi.mock('@/components/NoteEditor.vue', () => ({
  __esModule: true,
  default: { name: 'NoteEditor', template: '<div />' }
}));
vi.mock('@/components/common/BaseEntityView.vue', () => ({
  __esModule: true,
  default: { name: 'BaseEntityView', template: '<div><slot /><slot name="editor" /></div>' }
}));
vi.mock('@/utils/markdownParser', () => ({
  parseMarkdown: (content: string) => `<p>${content}</p>`
}));
vi.mock('@/stores/notes', () => ({
  useNoteStore: () => ({
    loadNotes: vi.fn(),
    getNoteById: (id: string) => id === 'n1' ? { id: 'n1', title: 'Test Note', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 } : null,
    updateNote: vi.fn(),
    deleteNote: vi.fn()
  })
}));
vi.mock('@/stores/modules', () => ({
  useModuleStore: () => ({
    loadModules: vi.fn(),
    getModuleName: vi.fn(() => 'Module Name')
  })
}));

const $route = { params: { id: 'n1' } };
const $router = { push: vi.fn() };

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
    // The mock store's deleteNote is a vi.fn()
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
