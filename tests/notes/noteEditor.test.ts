import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

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
        expose({ getSnapshot: () => '{"document":"snapshot"}' });
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
  moduleId: null,
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
        TagSelector: true,
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
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      contentType: 'draw',
      content: '{"document":"snapshot"}',
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
});
