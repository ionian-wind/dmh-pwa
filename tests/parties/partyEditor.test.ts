import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { Party } from '@/types';

const mocks = vi.hoisted(() => ({
  alert: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/dialogs', () => ({ alert: mocks.alert }));

import PartyEditor from '@/parties/PartyEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';

const EntityMarkdownEditorStub = defineComponent({
  name: 'EntityMarkdownEditor',
  props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => 'Latest description' });
    return () => h('div', { class: 'entity-markdown-editor-stub' });
  },
});

const EntitiesLinkingStub = defineComponent({
  name: 'EntitiesLinking',
  props: ['kind', 'modelValue'],
  emits: ['update:modelValue'],
  setup() {
    return () => h('div', { class: 'entities-linking-stub' });
  },
});

const party = {
  id: 'p1',
  name: 'The Guild',
  description: 'Old description',
  characters: ['c1'],
  moduleIds: ['m1'],
  createdAt: 1,
  updatedAt: 1,
} satisfies Party;

function mountEditor(item: Party | null = party) {
  return mount(PartyEditor, {
    props: { isOpen: true, party: item },
    global: {
      stubs: {
        EntityMarkdownEditor: EntityMarkdownEditorStub,
        EntitiesLinking: EntitiesLinkingStub,
      },
    },
  });
}

describe('PartyEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the latest Markdown description and links', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.findComponent(BaseModal).props('tabs')).toHaveLength(2);
    expect(wrapper.find('.note-options-button').exists()).toBe(false);

    wrapper
      .findComponent(EntityMarkdownEditorStub)
      .vm.$emit('update:modelValue', 'Changed description');
    await nextTick();

    const groups = wrapper.findAllComponents(EntitiesLinkingStub);
    groups[0].vm.$emit('update:modelValue', [{ kind: 'module', id: 'm2' }]);
    groups[1].vm.$emit('update:modelValue', [{ kind: 'character', id: 'c2' }]);
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'p1',
      name: 'The Guild',
      description: 'Latest description',
      moduleIds: ['m2'],
      characters: ['c2'],
    });
    wrapper.unmount();
  });

  it('normalizes legacy parties with missing optional fields', async () => {
    const wrapper = mountEditor({
      id: 'p2',
      name: 'Legacy',
      createdAt: 1,
      updatedAt: 1,
    } as Party);
    await flushPromises();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'p2',
      name: 'Legacy',
      moduleIds: [],
      characters: [],
    });
    wrapper.unmount();
  });

  it('resets on close and rejects submissions without a name', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.setProps({ isOpen: false });
    await wrapper.setProps({ isOpen: true, party: null });
    await nextTick();

    expect(wrapper.findComponent(BaseModal).props('isOpen')).toBe(true);
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(mocks.alert).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });

  it('shows formatting help only in raw mode', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('.party-help-button').exists()).toBe(false);
    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    await nextTick();

    const help = wrapper.find('.party-help-button');
    expect(help.exists()).toBe(true);
    expect(help.attributes('href')).toContain(
      '/help/en/reference/markdown.html',
    );
    expect(help.attributes('target')).toBe('_blank');
    wrapper.unmount();
  });
});
