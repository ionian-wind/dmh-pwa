import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import NoteEditor from '@/notes/NoteEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';
import { stripBlockAnchors } from '@/utils/noteAnchors';

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
}));

const MarkdownEditorStub = defineComponent({
  name: 'MarkdownEditor',
  props: { modelValue: String },
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => '# Latest markdown' });
    return () => h('div', { class: 'markdown-editor-stub' });
  },
});

const TagSelectorStub = defineComponent({
  name: 'TagSelector',
  props: { modelValue: { type: Array, default: () => [] } },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'tag-selector-stub' });
  },
});

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: { kind: String, modelValue: Array },
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

const baseNote = {
  id: 'n1',
  title: 'Note',
  content: '',
  typeId: null,
  tags: [],
  createdAt: 1,
  updatedAt: 1,
} as const;

function mountEditor(props: Record<string, unknown>) {
  return mount(NoteEditor, {
    props: { isOpen: true, ...props },
    global: {
      stubs: {
        MarkdownEditor: MarkdownEditorStub,
        EntitiesLinking: EntitiesLinkingStub,
        NoteTypeSelector: true,
        TagSelector: TagSelectorStub,
      },
    },
  });
}

describe('NoteEditor', () => {
  it('shows the linked entities tab when creating a note', () => {
    const wrapper = mountEditor({ note: null });

    expect(
      wrapper
        .findComponent(BaseModal)
        .props('tabs')
        .map((tab: any) => tab.name),
    ).toEqual(['main', 'links']);
    wrapper.unmount();
  });

  it('uses the markdown editor and reads its latest content', async () => {
    const wrapper = mountEditor({ note: baseNote });

    expect(wrapper.findComponent(MarkdownEditorStub).exists()).toBe(true);

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    const submitted = wrapper.emitted('submit')?.[0]?.[0] as any;
    expect(stripBlockAnchors(submitted.content)).toBe('# Latest markdown');
    expect(submitted.content).toContain('dmh:block=');
  });

  it('rejects a note when both title and content are empty', async () => {
    const EmptyEditorStub = defineComponent({
      name: 'MarkdownEditor',
      props: { modelValue: String },
      setup(_, { expose }) {
        expose({ getMarkdown: () => '' });
        return () => h('div', { class: 'markdown-editor-stub' });
      },
    });
    const wrapper = mount(NoteEditor, {
      props: { isOpen: true, note: null },
      global: {
        stubs: {
          MarkdownEditor: EmptyEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: TagSelectorStub,
        },
      },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(alert).toHaveBeenCalledWith('Enter a title or content.');
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('saves a note with a title and empty content', async () => {
    const EmptyEditorStub = defineComponent({
      name: 'MarkdownEditor',
      props: { modelValue: String },
      setup(_, { expose }) {
        expose({ getMarkdown: () => '' });
        return () => h('div', { class: 'markdown-editor-stub' });
      },
    });
    const wrapper = mount(NoteEditor, {
      props: { isOpen: true, note: { ...baseNote, content: '' } },
      global: {
        stubs: {
          MarkdownEditor: EmptyEditorStub,
          EntitiesLinking: EntitiesLinkingStub,
          NoteTypeSelector: true,
          TagSelector: TagSelectorStub,
        },
      },
    });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      title: 'Note',
    });
  });

  it('saves a note with content and no title', async () => {
    const wrapper = mountEditor({ note: { ...baseNote, title: '' } });

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      title: '',
      content: expect.stringContaining('Latest markdown'),
    });
  });

  it('binds title, type, tags, mode toggle and content updates', async () => {
    const wrapper = mountEditor({ note: baseNote });

    wrapper
      .findAllComponents({ name: 'QInput' })[0]
      .vm.$emit('update:modelValue', 'Renamed');
    wrapper
      .findComponent({ name: 'NoteTypeSelector' })
      .vm.$emit('update:modelValue', 'type-1');
    wrapper
      .findComponent({ name: 'TagSelector' })
      .vm.$emit('update:modelValue', ['lore']);
    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    wrapper
      .findComponent(MarkdownEditorStub)
      .vm.$emit('update:modelValue', 'changed');

    wrapper.findComponent(BaseModal).vm.$emit('submit');

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      title: 'Renamed',
      typeId: 'type-1',
      tags: ['lore'],
    });
  });

  it('exposes note options from an icon-only footer button', () => {
    const wrapper = mountEditor({ note: baseNote });
    const options = wrapper.find('.note-options-button');

    expect(options.exists()).toBe(true);
    expect(options.attributes('title')).toBe('options');
    expect(options.attributes('aria-label')).toBe('options');
    expect(options.find('svg').exists()).toBe(true);
    expect(options.findComponent({ name: 'NoteTypeSelector' }).exists()).toBe(
      true,
    );
    expect(options.findComponent({ name: 'TagSelector' }).exists()).toBe(true);
  });

  it('shows markdown help only in raw mode and opens the help dialog', async () => {
    const wrapper = mountEditor({ note: baseNote });

    expect(wrapper.find('.note-help-button').exists()).toBe(false);

    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    await flushPromises();

    const help = wrapper.find('.note-help-button');
    expect(help.exists()).toBe(true);
    expect(help.find('svg').exists()).toBe(true);

    expect(help.attributes('href')).toContain(
      '/help/en/reference/markdown.html',
    );
    expect(help.attributes('target')).toBe('_blank');
    wrapper.unmount();
  });

  it('shows tags typed in the editor in the options menu', async () => {
    const wrapper = mountEditor({
      note: { ...baseNote, content: 'Intro', tags: ['tagged'] },
    });

    wrapper
      .findComponent(MarkdownEditorStub)
      .vm.$emit('update:modelValue', 'Intro #inline with #second');
    await nextTick();

    const tagSelector = wrapper.findComponent(TagSelectorStub);
    expect(tagSelector.props('modelValue')).toEqual([
      'tagged',
      'inline',
      'second',
    ]);

    tagSelector.vm.$emit('update:modelValue', ['tagged', 'inline']);
    await nextTick();

    const markdown = wrapper
      .findComponent(MarkdownEditorStub)
      .props('modelValue');
    expect(markdown).not.toContain('#second');
    expect(markdown).toContain('second');
    expect(wrapper.findComponent(TagSelectorStub).props('modelValue')).toEqual([
      'tagged',
      'inline',
    ]);

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      tags: ['tagged', 'inline'],
    });
  });
});
