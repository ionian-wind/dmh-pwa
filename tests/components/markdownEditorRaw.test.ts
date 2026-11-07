import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';

import MarkdownEditor from '@/components/common/MarkdownEditor.vue';

const mocks = vi.hoisted(() => ({ runCmd: vi.fn() }));

const QEditorStub = defineComponent({
  name: 'QEditor',
  props: {
    modelValue: String,
    toolbar: Array,
    flat: Boolean,
    square: Boolean,
  },
  emits: ['update:modelValue', 'paste'],
  setup(_, { expose }) {
    expose({ runCmd: mocks.runCmd });
    return () => h('div', { class: 'q-editor-stub' });
  },
});

function mountRaw(modelValue = 'first\nsecond') {
  return mount(MarkdownEditor, {
    props: { modelValue, isWYSIWYGMode: false },
    global: { stubs: { QEditor: QEditorStub } },
  });
}

describe('MarkdownEditor raw mode', () => {
  it('uses a toolbar-free flat QEditor with converted markdown', () => {
    const wrapper = mountRaw();
    const editor = wrapper.findComponent(QEditorStub);

    expect(editor.props('modelValue')).toBe('first<br>second');
    expect(editor.props('toolbar')).toEqual([]);
    expect(editor.props('flat')).toBe(true);
    expect(editor.props('square')).toBe(true);
    wrapper.unmount();
  });

  it('hides block anchors in raw mode and preserves them on update', async () => {
    const wrapper = mountRaw(
      'first <!-- dmh:block=note-block-one123 -->\nsecond',
    );
    const editor = wrapper.findComponent(QEditorStub);
    expect(editor.props('modelValue')).toBe('first<br>second');

    editor.vm.$emit('update:modelValue', '<div>first</div><div>second</div>');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      'first <!-- dmh:block=note-block-one123 -->\nsecond',
    ]);
    wrapper.unmount();
  });

  it('converts QEditor HTML back to markdown updates', async () => {
    const wrapper = mountRaw();
    wrapper
      .findComponent(QEditorStub)
      .vm.$emit('update:modelValue', '<div>first</div><div>second</div>');
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      'first\nsecond',
    ]);
    wrapper.unmount();
  });

  it('pastes only plain text', () => {
    const wrapper = mountRaw();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();
    const event = {
      target: { nodeName: 'DIV' },
      preventDefault,
      stopPropagation,
      originalEvent: {
        clipboardData: { getData: vi.fn(() => 'plain text') },
      },
    };

    wrapper.findComponent(QEditorStub).vm.$emit('paste', event);

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(mocks.runCmd).toHaveBeenCalledWith('insertText', 'plain text');
    wrapper.unmount();
  });

  it('ignores paste events from inputs', () => {
    const wrapper = mountRaw();
    mocks.runCmd.mockClear();

    wrapper.findComponent(QEditorStub).vm.$emit('paste', {
      target: { nodeName: 'INPUT' },
    });

    expect(mocks.runCmd).not.toHaveBeenCalled();
    wrapper.unmount();
  });
});
