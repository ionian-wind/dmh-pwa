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
jest.mock('@/stores/notes', () => ({ useNoteStore: () => ({ 
  items: [], 
  filtered: [
    { id: 'n1', title: 'Note One', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 },
    { id: 'n2', title: 'Note Two', content: 'Content', tags: [], moduleId: null, typeId: null, createdAt: 0, updatedAt: 0 }
  ], 
  create: jest.fn(), 
  update: jest.fn(), 
  remove: jest.fn(), 
  load: jest.fn() 
}) }));

jest.mock('@/stores/modules', () => ({ useModuleStore: () => ({ 
  items: [], 
  currentModuleFilter: 'any', 
  load: jest.fn() 
}) }));

jest.mock('@/stores/parties', () => ({ usePartyStore: () => ({ 
  load: jest.fn() 
}) }));

jest.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ 
  load: jest.fn() 
}) }));

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
      useNoteStore: () => ({ items: [], filtered: [], create: jest.fn(), update: jest.fn(), remove: jest.fn(), load: jest.fn() })
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
    expect(store.create).toHaveBeenCalled();
  });

  it('calls store updateNote on submit if id exists', async () => {
    const wrapper = mount(NotesView);
    await wrapper.findComponent({ name: 'Button' }).trigger('click');
    const store = require('@/stores/notes').useNoteStore();
    await wrapper.findComponent({ name: 'NoteEditor' }).vm.$emit('submit', { title: 'Edit', id: '1' });
    expect(store.update).toHaveBeenCalled();
  });

  it('calls store deleteNote on delete event', async () => {
    window.confirm = jest.fn(() => true);
    const wrapper = mount(NotesView);
    const store = require('@/stores/notes').useNoteStore();
    await wrapper.findAllComponents({ name: 'NoteCard' })[0].vm.$emit('delete', { id: '1', title: 'Note 1' });
    expect(store.remove).toHaveBeenCalledWith('1');
  });

  it('filters notes by search query', async () => {
    const wrapper = mount(NotesView);
    await wrapper.find('.search-input').setValue('Note 1');
    await flushPromises();
    expect(wrapper.findAll('.note-card').length).toBe(1);
  });
}); 