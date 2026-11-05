import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import NoteEditor from '@/notes/NoteEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';
import { alert } from '@/dialogs';

vi.mock('@/dialogs', () => ({
  alert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/notes/NoteCanvas.vue', async () => {
  const { defineComponent, h } = await import('vue');
  return {
    default: defineComponent({
      name: 'NoteCanvas',
      props: { modelValue: String, readonly: Boolean },
      setup(_, { expose }) {
        expose({
          getSnapshot: () => '{"document":"snapshot"}',
          getPreview: () => Promise.resolve('data:image/png;base64,preview'),
        });
        return () => h('div', { class: 'note-canvas-stub' });
      },
    }),
  };
});

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
  contentType: 'text',
  typeId: null,
  tags: [],
  moduleIds: [],
  hidden: false,
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

describe('NoteEditor content types', () => {
  it('uses the markdown editor and reads its latest content for text notes', async () => {
    const wrapper = mountEditor({ note: baseNote });

    expect(wrapper.findComponent(MarkdownEditorStub).exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'NoteCanvas' }).exists()).toBe(false);

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      contentType: 'text',
      content: '# Latest markdown',
    });
  });

  it('uses the canvas and reads a tldraw snapshot for drawing notes', async () => {
    const wrapper = mountEditor({
      note: { ...baseNote, contentType: 'draw' },
    });

    expect(wrapper.findComponent({ name: 'NoteCanvas' }).exists()).toBe(true);
    expect(wrapper.findComponent(MarkdownEditorStub).exists()).toBe(false);

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      contentType: 'draw',
      content: '{"document":"snapshot"}',
      preview: 'data:image/png;base64,preview',
    });
  });

  it('starts a new drawing note from the contentType prop', () => {
    const wrapper = mountEditor({ note: null, contentType: 'draw' });

    expect(wrapper.findComponent({ name: 'NoteCanvas' }).exists()).toBe(true);
  });

  it('requires a title before submitting', async () => {
    const wrapper = mountEditor({ note: null });
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(alert).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
  });

  it('edits and preserves the note background colour', async () => {
    const wrapper = mountEditor({
      note: { ...baseNote, backgroundColor: '#ffeeaa' },
    });

    const picker = wrapper.findComponent({ name: 'ColorPicker' });
    expect(picker.exists()).toBe(true);
    expect(picker.props('modelValue')).toBe('#ffeeaa');

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      backgroundColor: '#ffeeaa',
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
    expect(options.findComponent({ name: 'ColorPicker' }).exists()).toBe(true);
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

    await help.trigger('click');
    await flushPromises();

    const dialog = wrapper.findComponent({ name: 'MarkdownHelpDialog' });
    expect(dialog.exists()).toBe(true);
    expect(dialog.props('isOpen')).toBe(true);
    expect(wrapper.text()).toContain('Formatting Help');
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
