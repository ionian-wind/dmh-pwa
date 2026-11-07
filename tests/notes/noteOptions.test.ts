import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import NoteOptions from '@/notes/NoteOptions.vue';
import type { Note } from '@/types';

const baseNote: Note = {
  id: 'n1',
  title: 'Note',
  content: 'Intro #inline',
  contentType: 'text',
  typeId: null,
  tags: ['tagged'],
  moduleIds: [],
  createdAt: 1,
  updatedAt: 1,
};

function mountOptions(note: Note = baseNote) {
  return mount(NoteOptions, {
    props: { note },
    global: {
      stubs: {
        NoteTypeSelector: true,
        TagSelector: true,
      },
    },
  });
}

describe('NoteOptions', () => {
  it('renders type and tag controls', () => {
    const wrapper = mountOptions();

    expect(wrapper.findComponent({ name: 'NoteTypeSelector' }).exists()).toBe(
      true,
    );
    expect(wrapper.findComponent({ name: 'TagSelector' }).exists()).toBe(true);
    wrapper.unmount();
  });

  it('emits type changes', () => {
    const wrapper = mountOptions();

    wrapper
      .findComponent({ name: 'NoteTypeSelector' })
      .vm.$emit('update:modelValue', 'type-1');
    expect(wrapper.emitted('update:note')?.[0]?.[0]).toMatchObject({
      typeId: 'type-1',
    });
    wrapper.unmount();
  });

  it('merges hashtags from content and removes them from content', () => {
    const wrapper = mountOptions();
    const tagSelector = wrapper.findComponent({ name: 'TagSelector' });

    expect(tagSelector.props('modelValue')).toEqual(['tagged', 'inline']);

    tagSelector.vm.$emit('update:modelValue', ['tagged']);
    const updated = wrapper.emitted('update:note')?.[0]?.[0] as Note;
    expect(updated.tags).toEqual(['tagged']);
    expect(updated.content).not.toContain('#inline');
    wrapper.unmount();
  });

  it('ignores drawing content when merging tags', () => {
    const wrapper = mountOptions({
      ...baseNote,
      contentType: 'draw',
      content: '{"document":{}}',
    });

    expect(
      wrapper.findComponent({ name: 'TagSelector' }).props('modelValue'),
    ).toEqual(['tagged']);

    wrapper
      .findComponent({ name: 'TagSelector' })
      .vm.$emit('update:modelValue', []);
    const updated = wrapper.emitted('update:note')?.[0]?.[0] as Note;
    expect(updated.content).toBe('{"document":{}}');
    wrapper.unmount();
  });

  it('handles notes without a tags array', () => {
    const wrapper = mountOptions({ ...baseNote, tags: undefined as never });

    expect(
      wrapper.findComponent({ name: 'TagSelector' }).props('modelValue'),
    ).toEqual(['inline']);
    wrapper.unmount();
  });
});
