import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  alert: vi.fn().mockResolvedValue(undefined),
  getLinkedIds: vi.fn((_kind: string, _id: string, target: string) =>
    target === 'party' ? ['p1'] : ['l1'],
  ),
  setLinkedIds: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/dialogs', () => ({ alert: mocks.alert }));
vi.mock('@/components/common/entityDragLinking/relations', () => ({
  useEntityLinkRelations: () => ({
    getLinkedIds: mocks.getLinkedIds,
    setLinkedIds: mocks.setLinkedIds,
  }),
}));
vi.mock('@/stores/parties', () => ({
  usePartyStore: () => ({ load: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => ({ load: vi.fn().mockResolvedValue(undefined) }),
}));

import CharacterEditor from '@/characters/CharacterEditor.vue';
import BaseModal from '@/components/common/BaseModal.vue';

const EntityMarkdownEditorStub = defineComponent({
  name: 'EntityMarkdownEditor',
  props: ['modelValue', 'isVisualMode', 'entityId', 'entityType'],
  emits: ['update:modelValue'],
  setup(_, { expose }) {
    expose({ getMarkdown: () => 'Latest notes' });
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

const character = {
  id: 'c1',
  name: 'Aria',
  notes: 'Old notes',
  createdAt: 1,
  updatedAt: 1,
};

function mountEditor(item: typeof character | null = character) {
  return mount(CharacterEditor, {
    props: { isOpen: true, character: item },
    global: {
      stubs: {
        EntityMarkdownEditor: EntityMarkdownEditorStub,
        EntitiesLinking: EntitiesLinkingStub,
      },
    },
  });
}

describe('CharacterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses note-style tabs and submits the latest Markdown', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.findComponent(BaseModal).props('tabs')).toHaveLength(2);
    expect(wrapper.find('.note-options-button').exists()).toBe(false);

    const markdown = wrapper.findComponent(EntityMarkdownEditorStub);
    markdown.vm.$emit('update:modelValue', 'Changed notes');
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'c1',
      name: 'Aria',
      notes: 'Latest notes',
    });
    wrapper.unmount();
  });

  it('edits party and location links from the linked-entities tab', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(mocks.getLinkedIds).toHaveBeenCalledWith('character', 'c1', 'party');
    expect(mocks.getLinkedIds).toHaveBeenCalledWith(
      'character',
      'c1',
      'location',
    );

    const groups = wrapper.findAllComponents(EntitiesLinkingStub);
    expect(groups).toHaveLength(3);

    groups[1].vm.$emit('update:modelValue', [
      { kind: 'party', id: 'p2' },
      { kind: 'location', id: 'ignored' },
    ]);
    await flushPromises();
    expect(mocks.setLinkedIds).toHaveBeenCalledWith(
      'character',
      'c1',
      'party',
      ['p2'],
    );

    groups[2].vm.$emit('update:modelValue', [{ kind: 'location', id: 'l2' }]);
    await flushPromises();
    expect(mocks.setLinkedIds).toHaveBeenCalledWith(
      'character',
      'c1',
      'location',
      ['l2'],
    );
    wrapper.unmount();
  });

  it('does not persist links for a new character', async () => {
    const wrapper = mountEditor(null);
    await flushPromises();

    const groups = wrapper.findAllComponents(EntitiesLinkingStub);
    groups[1].vm.$emit('update:modelValue', [{ kind: 'party', id: 'p2' }]);
    await flushPromises();

    expect(mocks.setLinkedIds).not.toHaveBeenCalled();

    groups[0].vm.$emit('update:modelValue', [{ kind: 'module', id: 'm2' }]);
    await nextTick();
    await wrapper.find('.entity-inline-editor input').setValue('New Hero');
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      moduleIds: ['m2'],
    });
    wrapper.unmount();
  });

  it('shows formatting help only in raw mode', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('.character-help-button').exists()).toBe(false);
    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    await nextTick();

    const help = wrapper.find('.character-help-button');
    expect(help.exists()).toBe(true);
    expect(help.attributes('href')).toContain(
      '/help/en/reference/markdown.html',
    );
    expect(help.attributes('target')).toBe('_blank');
    wrapper.unmount();
  });

  it('resets its draft when the character prop changes', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.setProps({ character: null });
    await nextTick();
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(mocks.alert).toHaveBeenCalled();
    wrapper.unmount();
  });
});
