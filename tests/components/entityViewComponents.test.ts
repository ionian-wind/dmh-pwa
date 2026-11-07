import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import EntityContentSurface from '@/components/common/EntityContentSurface.vue';
import EntityInlineEditor from '@/components/common/EntityInlineEditor.vue';
import EntityMarkdownEditor from '@/components/common/EntityMarkdownEditor.vue';
import EntityModeControls from '@/components/common/EntityModeControls.vue';

const MarkdownEditorStub = defineComponent({
  name: 'MarkdownEditor',
  props: {
    modelValue: String,
    isWYSIWYGMode: Boolean,
    currentEntityId: String,
    currentEntityType: String,
    tags: Array,
    placeholder: String,
  },
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => 'Latest' });
    return () => h('div', { class: 'markdown-editor-stub' });
  },
});

describe('shared entity view components', () => {
  it('EntityContentSurface renders its slot', () => {
    const wrapper = mount(EntityContentSurface, {
      slots: { default: 'Body' },
    });

    expect(wrapper.text()).toBe('Body');
    wrapper.unmount();
  });

  it('EntityInlineEditor edits the title and renders validation and slot content', async () => {
    const wrapper = mount(EntityInlineEditor, {
      props: {
        title: 'Aria',
        titlePlaceholder: 'Name',
        validationError: 'Required',
      },
      slots: { default: '<div class="slot-content">Editor</div>' },
    });

    const input = wrapper.find('input');
    expect(input.attributes('placeholder')).toBe('Name');
    expect(wrapper.text()).toContain('Required');
    expect(wrapper.find('.slot-content').exists()).toBe(true);

    await input.setValue('Renamed');
    expect(wrapper.emitted('update:title')?.at(-1)).toEqual(['Renamed']);
    wrapper.unmount();
  });

  it('EntityMarkdownEditor forwards props, update events and getMarkdown', async () => {
    const wrapper = mount(EntityMarkdownEditor, {
      props: {
        modelValue: 'Text',
        isVisualMode: false,
        entityId: 'c1',
        entityType: 'character',
        tags: ['hero'],
        placeholder: 'Notes',
      },
      global: { stubs: { MarkdownEditor: MarkdownEditorStub } },
    });

    const editor = wrapper.findComponent(MarkdownEditorStub);
    expect(editor.props()).toMatchObject({
      modelValue: 'Text',
      isWYSIWYGMode: false,
      currentEntityId: 'c1',
      currentEntityType: 'character',
      tags: ['hero'],
      placeholder: 'Notes',
    });

    editor.vm.$emit('update:modelValue', 'Changed');
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Changed']);

    expect((wrapper.vm as any).getMarkdown()).toBe('Latest');
    wrapper.unmount();
  });

  it('EntityModeControls emits view/edit and visual mode changes', async () => {
    const wrapper = mount(EntityModeControls, {
      props: { isEditMode: true, isVisualMode: false },
    });

    const buttons = wrapper.findAll('button');
    expect(buttons[0].attributes('aria-pressed')).toBe('false');
    expect(buttons[1].attributes('aria-pressed')).toBe('true');

    await buttons[0].trigger('click');
    await buttons[1].trigger('click');
    expect(wrapper.emitted('update:isEditMode')).toEqual([[false], [true]]);

    const toggle = wrapper.findComponent({ name: 'QToggle' });
    expect(toggle.props('modelValue')).toBe(false);
    toggle.vm.$emit('update:modelValue', true);
    expect(wrapper.emitted('update:isVisualMode')).toEqual([[true]]);
    wrapper.unmount();
  });

  it('hides the visual mode row outside edit mode', () => {
    const wrapper = mount(EntityModeControls, {
      props: { isEditMode: false, isVisualMode: true },
    });

    expect(wrapper.find('.entity-visual-mode-toggle').exists()).toBe(false);
    expect(wrapper.find('.entity-mode-toggle').exists()).toBe(true);
    wrapper.unmount();
  });
});
