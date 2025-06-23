import { mount, flushPromises } from '@vue/test-utils';
import NotesView from '@/views/NotesView.vue';
import { setActivePinia, createPinia } from 'pinia';
import { vi } from 'vitest';

// Mock router
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Mock NoteCard and NoteEditor
vi.mock('@/components/NoteCard.vue', () => ({}));
vi.mock('@/components/NoteEditor.vue', () => ({}));

// Mock stores
vi.mock('@/stores/notes', () => ({ useNoteStore: () => ({ create: vi.fn(), update: vi.fn(), remove: vi.fn(), load: vi.fn() }) }));
vi.mock('@/stores/modules', () => ({ useModuleStore: () => ({ items: [], currentModuleFilter: 'any', load: vi.fn() }) }));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => ({ load: vi.fn() }) }));
vi.mock('@/stores/monsters', () => ({ useMonsterStore: () => ({ load: vi.fn() }) }));
vi.mock('@/stores/encounters', () => ({ useEncounterStore: () => ({ load: vi.fn() }) }));
vi.mock('@/stores/characters', () => ({ useCharacterStore: () => ({ load: vi.fn() }) }));

describe('NotesView', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('renders header and add button', () => {
    const wrapper = mount(NotesView);
    expect(wrapper.find('h1').text()).toBe('Notes');
    expect(wrapper.findComponent({ name: 'Button' }).exists()).toBe(true);
  });

  it('shows empty state if no notes', async () => {
    vi.doMock('@/stores/notes', () => ({
      useNoteStore: () => ({ items: [], filtered: [], create: vi.fn(), update: vi.fn(), remove: vi.fn(), load: vi.fn() })
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
    window.confirm = vi.fn(() => true);
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