import { mount } from '@vue/test-utils';
import NoteCard from '../../src/notes/NoteCard.vue';
import { vi } from 'vitest';

vi.mock('@/stores/notes', () => ({}));
vi.mock('@/stores/modules', () => ({}));

const mockNote = {
  id: 'note-1',
  title: 'Test Note',
  content: 'This is a test note.',
  typeId: 'type-1',
  tags: ['tag1', 'tag2'],
  moduleId: 'mod-1',
  createdAt: 0,
  updatedAt: 0
};

describe('NoteCard', () => {
  it('renders note title and content', () => {
    const wrapper = mount(NoteCard, { props: { note: mockNote } });
    expect(wrapper.text()).toContain('Test Note');
    expect(wrapper.text()).toContain('This is a test note.');
  });

  it('renders tags', () => {
    const wrapper = mount(NoteCard, { props: { note: mockNote } });
    const tags = wrapper.findAll('.tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].text()).toBe('tag1');
    expect(tags[1].text()).toBe('tag2');
  });

  it('renders module badge if moduleName is provided', () => {
    const wrapper = mount(NoteCard, { props: { note: mockNote, moduleName: 'Module X' } });
    expect(wrapper.find('.module-badge').exists()).toBe(true);
    expect(wrapper.find('.module-badge').text()).toBe('Module X');
  });

  it('does not render module badge if moduleName is not provided', () => {
    const wrapper = mount(NoteCard, { props: { note: mockNote } });
    expect(wrapper.find('.module-badge').exists()).toBe(false);
  });

  it('emits view, edit, and delete events', async () => {
    const wrapper = mount(NoteCard, { props: { note: mockNote } });
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('view');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('edit');
    await wrapper.findComponent({ name: 'BaseCard' }).vm.$emit('delete');
    expect(wrapper.emitted('view')).toBeTruthy();
    expect(wrapper.emitted('edit')).toBeTruthy();
    expect(wrapper.emitted('delete')).toBeTruthy();
    expect(wrapper.emitted('view')[0][0]).toEqual(mockNote);
    expect(wrapper.emitted('edit')[0][0]).toEqual(mockNote);
    expect(wrapper.emitted('delete')[0][0]).toEqual(mockNote);
  });
}); 
