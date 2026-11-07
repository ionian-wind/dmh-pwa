import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  alert: vi.fn().mockResolvedValue(undefined),
  getLinkedIds: vi.fn((_kind: string, _id: string, target: string) =>
    target === 'encounter' ? ['e1'] : ['l1'],
  ),
  setLinkedIds: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/dialogs', () => ({
  alert: mocks.alert,
  confirm: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/components/common/entityDragLinking/relations', () => ({
  useEntityLinkRelations: () => ({
    getLinkedIds: mocks.getLinkedIds,
    setLinkedIds: mocks.setLinkedIds,
  }),
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({ load: vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => ({ load: vi.fn().mockResolvedValue(undefined) }),
}));

import MonsterEditor from '@/monsters/MonsterEditor.vue';
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

const monster = {
  id: 'm1',
  name: 'Goblin',
  notes: 'Old notes',
  createdAt: 1,
  updatedAt: 1,
};

function mountEditor(item: typeof monster | null = monster) {
  return mount(MonsterEditor, {
    props: { isOpen: true, monster: item },
    global: {
      stubs: {
        EntityMarkdownEditor: EntityMarkdownEditorStub,
        EntitiesLinking: EntitiesLinkingStub,
      },
    },
  });
}

describe('MonsterEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits the latest Markdown notes', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.findComponent(BaseModal).props('tabs')).toHaveLength(2);
    expect(wrapper.find('.note-options-button').exists()).toBe(false);

    wrapper
      .findComponent(EntityMarkdownEditorStub)
      .vm.$emit('update:modelValue', 'Changed notes');
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      id: 'm1',
      name: 'Goblin',
      notes: 'Latest notes',
    });
    wrapper.unmount();
  });

  it('edits encounter and location links', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(mocks.getLinkedIds).toHaveBeenCalledWith(
      'monster',
      'm1',
      'encounter',
    );
    expect(mocks.getLinkedIds).toHaveBeenCalledWith(
      'monster',
      'm1',
      'location',
    );

    const groups = wrapper.findAllComponents(EntitiesLinkingStub);
    groups[1].vm.$emit('update:modelValue', [{ kind: 'encounter', id: 'e2' }]);
    groups[2].vm.$emit('update:modelValue', [{ kind: 'location', id: 'l2' }]);
    await flushPromises();

    expect(mocks.setLinkedIds).toHaveBeenCalledWith(
      'monster',
      'm1',
      'encounter',
      ['e2'],
    );
    expect(mocks.setLinkedIds).toHaveBeenCalledWith(
      'monster',
      'm1',
      'location',
      ['l2'],
    );
    wrapper.unmount();
  });

  it('does not persist encounter/location links for a new monster', async () => {
    const wrapper = mountEditor(null);
    await flushPromises();

    const groups = wrapper.findAllComponents(EntitiesLinkingStub);
    groups[1].vm.$emit('update:modelValue', [{ kind: 'encounter', id: 'e2' }]);
    await flushPromises();
    expect(mocks.setLinkedIds).not.toHaveBeenCalled();

    await wrapper.find('.entity-inline-editor input').setValue('New Monster');
    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      name: 'New Monster',
    });
    wrapper.unmount();
  });

  it('shows formatting help only in raw mode', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    expect(wrapper.find('.monster-help-button').exists()).toBe(false);
    wrapper
      .findComponent({ name: 'QToggle' })
      .vm.$emit('update:modelValue', false);
    await nextTick();

    const help = wrapper.find('.monster-help-button');
    expect(help.exists()).toBe(true);
    expect(help.attributes('href')).toContain(
      '/help/en/reference/markdown.html',
    );
    expect(help.attributes('target')).toBe('_blank');
    wrapper.unmount();
  });

  it('resets and validates a missing name', async () => {
    const wrapper = mountEditor();
    await flushPromises();

    await wrapper.setProps({ isOpen: false });
    await wrapper.setProps({ isOpen: true, monster: null });
    await nextTick();

    wrapper.findComponent(BaseModal).vm.$emit('submit');
    await flushPromises();
    expect(mocks.alert).toHaveBeenCalled();
    expect(wrapper.emitted('submit')).toBeUndefined();
    wrapper.unmount();
  });
});
