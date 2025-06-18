import { mount, flushPromises } from '@vue/test-utils';
import NotesView from '@/views/NotesView.vue';
import { setActivePinia, createPinia } from 'pinia';

// Mock router
jest.mock('vue-router', () => ({
  useRouter: () => ({ push: jest.fn() })
}));

// Mock NoteCard and NoteEditor
jest.mock('@/components/NoteCard.vue', () => ({
  __esModule: true,
  default: {
    name: 'NoteCard',
    props: ['note', 'moduleName'],
    emits: ['view', 'edit', 'delete'],
    template: '<div class="note-card">NoteCard</div>'
  }
}));
jest.mock('@/components/NoteEditor.vue', () => ({
  __esModule: true,
  default: {
    name: 'NoteEditor',
    props: ['note', 'isOpen'],
    emits: ['submit', 'cancel'],
    template: '<div class="note-editor">NoteEditor</div>'
  }
}));

// Mock stores
jest.mock('@/stores/notes', () => {
  const notes = [
    { id: '1', title: 'Note 1', content: 'Content 1', typeId: 't1', tags: ['a'], moduleId: 'm1', createdAt: 0, updatedAt: 0 },
    { id: '2', title: 'Note 2', content: 'Content 2', typeId: 't2', tags: ['b'], moduleId: 'm2', createdAt: 0, updatedAt: 0 }
  ];
  return {
    useNoteStore: () => ({
      notes,
      filteredNotes: notes,
      createNote: jest.fn(),
      updateNote: jest.fn(),
      deleteNote: jest.fn(),
      loadNotes: jest.fn()
    })
  };
});
jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ modules: [], currentModuleFilter: 'any', loadModules: jest.fn() }) }));
jest.mock('@/stores/parties', () => ({ usePartyStore: () => ({ loadParties: jest.fn() }) }));
jest.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ loadMonsters: jest.fn() }) }));

describe('NotesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    jest.clearAllMocks();
  });

  it('renders header and add button', () => {
    const wrapper = mount(NotesView);
    expect(wrapper.find('h1').text()).toBe('Notes');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no notes', async () => {
    jest.doMock('@/stores/notes', () => ({
      useNoteStore: () => ({ notes: [], filteredNotes: [], createNote: jest.fn(), updateNote: jest.fn(), deleteNote: jest.fn(), loadNotes: jest.fn() })
    }));
    const wrapper = mount(NotesView);
    await flushPromises();
    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No notes found');
  });

  it('shows notes grid if notes exist', () => {
    const wrapper = mount(NotesView);
    expect(wrapper.find('.notes-grid').exists()).toBe(true);
    expect(wrapper.findAll('.note-card').length).toBeGreaterThan(0);
  });

  it('opens editor when add button is clicked', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    expect(wrapper.findComponent({ name: 'NoteEditor' }).exists()).toBe(true);
  });

  it('opens editor when edit is emitted from NoteCard', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findAllComponents({ name: 'NoteCard' })[0].vm.$emit('edit', { id: '1' });
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'NoteEditor' }).exists()).toBe(true);
  });

  it('closes editor on cancel', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    await wrapper.findComponent({ name: 'NoteEditor' }).vm.$emit('cancel');
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent({ name: 'NoteEditor' }).exists()).toBe(false);
  });

  it('calls store createNote on submit if no id', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/notes').useNoteStore();
    await wrapper.findComponent({ name: 'NoteEditor' }).vm.$emit('submit', { title: 'New', id: undefined });
    expect(store.createNote).toHaveBeenCalled();
  });

  it('calls store updateNote on submit if id exists', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/notes').useNoteStore();
    await wrapper.findComponent({ name: 'NoteEditor' }).vm.$emit('submit', { title: 'Edit', id: '1' });
    expect(store.updateNote).toHaveBeenCalled();
  });

  it('calls store deleteNote on delete event', async () => {
    window.confirm = jest.fn(() => true);
    const wrapper = mount(NotesView);
    const store = require('@/stores/notes').useNoteStore();
    await wrapper.findAllComponents({ name: 'NoteCard' })[0].vm.$emit('delete', { id: '1', title: 'Note 1' });
    expect(store.deleteNote).toHaveBeenCalledWith('1');
  });

  it('filters notes by search query', async () => {
    const wrapper = mount(NotesView);
    await wrapper.find('.search-input').setValue('Note 1');
    await flushPromises();
    expect(wrapper.findAll('.note-card').length).toBe(1);
  });
}); 