import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { InlineEditState, Party } from '@/types';

const mocks = vi.hoisted(() => ({
  getLinks: vi.fn(() => []),
  getBacklinks: vi.fn(() => []),
  loadMentions: vi.fn().mockResolvedValue(undefined),
  loadCharacters: vi.fn().mockResolvedValue(undefined),
  updateParty: vi.fn().mockResolvedValue(undefined),
  characters: [] as any[],
}));

vi.mock('@/utils/storage', () => ({
  useMentionsStore: () => ({
    getLinks: mocks.getLinks,
    getBacklinks: mocks.getBacklinks,
    load: mocks.loadMentions,
  }),
}));

vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => ({
    filtered: mocks.characters,
    getById: (id: string) =>
      mocks.characters.find((character) => character.id === id) ?? null,
    load: mocks.loadCharacters,
  }),
}));

vi.mock('@/stores/parties', () => ({
  usePartyStore: () => ({ update: mocks.updateParty }),
}));

import PartyViewSidebar from '@/parties/PartyViewSidebar.vue';

const MentionsStub = defineComponent({
  name: 'Mentions',
  props: { title: String, entities: Array },
  setup: () => () => h('div', { class: 'mentions-stub' }),
});

const ScenesStub = defineComponent({
  name: 'EntityScenesPanel',
  props: { entityType: String, entityId: String, editable: Boolean },
  setup: () => () => h('div', { class: 'scenes-stub' }),
});

const EntityLinkingDialogStub = defineComponent({
  name: 'EntityLinkingDialog',
  props: {
    isOpen: Boolean,
    kind: String,
    title: String,
    options: { type: Array, default: () => [] },
    linkedIds: { type: Array, default: () => [] },
    multiple: Boolean,
  },
  emits: ['add', 'cancel'],
  setup: () => () => h('div', { class: 'entity-linking-dialog-stub' }),
});

const EntityInfoDialogStub = defineComponent({
  name: 'EntityInfoDialog',
  props: [
    'isOpen',
    'title',
    'picture',
    'notes',
    'to',
    'entityKind',
    'entityId',
  ],
  emits: ['cancel'],
  setup: () => () => h('div', { class: 'entity-info-dialog-stub' }),
});

const party: Party = {
  id: 'party-1',
  name: 'Heroes',
  description: '',
  characters: ['c1', 'c2'],
  createdAt: 1,
  updatedAt: 1,
};

function mountSidebar(
  editState?: InlineEditState<Party>,
  onStartCombat = vi.fn(),
) {
  return mount(PartyViewSidebar, {
    props: {
      party,
      editState,
      onStartCombat,
    },
    global: {
      stubs: {
        Mentions: MentionsStub,
        EntityScenesPanel: ScenesStub,
        EntityLinkingDialog: EntityLinkingDialogStub,
        EntityInfoDialog: EntityInfoDialogStub,
        RouterLink: true,
      },
    },
  });
}

describe('PartyViewSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.characters = [
      { id: 'c1', name: 'Aria', notes: 'Ranger' },
      { id: 'c2', name: 'Bob', notes: 'Wizard' },
      { id: 'c3', name: 'Cara', notes: 'Cleric' },
    ];
  });

  it('lists party characters and opens their info dialog', async () => {
    const wrapper = mountSidebar();
    await flushPromises();

    expect(
      wrapper
        .findAll('.character-row .character-name')
        .map((row) => row.text()),
    ).toEqual(['Aria', 'Bob']);
    expect(wrapper.find('.character-add-row').exists()).toBe(false);

    await wrapper.findAll('.character-row')[0].trigger('click');
    const dialog = wrapper.findComponent(EntityInfoDialogStub);
    expect(dialog.props()).toMatchObject({
      isOpen: true,
      title: 'Aria',
      notes: 'Ranger',
      entityKind: 'character',
      entityId: 'c1',
    });
    wrapper.unmount();
  });

  it('links and unlinks characters through the draft while editing', async () => {
    const editState = reactive<InlineEditState<Party>>({
      isEditMode: true,
      isVisualMode: true,
      draft: { ...party, characters: ['c1'] },
    });
    const wrapper = mountSidebar(editState);
    await flushPromises();

    expect(wrapper.findAll('.tab-item')).toHaveLength(2);
    expect(wrapper.find('.character-add-row').exists()).toBe(true);
    expect(
      wrapper
        .findAll('.character-row .character-name')
        .map((row) => row.text()),
    ).toEqual(['Aria']);

    await wrapper.find('.character-add-row').trigger('click');
    const linking = wrapper.findComponent(EntityLinkingDialogStub);
    expect(linking.props()).toMatchObject({
      isOpen: true,
      kind: 'character',
      linkedIds: ['c1'],
      multiple: true,
    });
    expect(linking.props('options')).toEqual([
      { id: 'c1', label: 'Aria' },
      { id: 'c2', label: 'Bob' },
      { id: 'c3', label: 'Cara' },
    ]);

    linking.vm.$emit('add', {
      refs: [
        { kind: 'character', id: 'c1' },
        { kind: 'character', id: 'c2' },
      ],
    });
    await nextTick();

    expect(editState.draft?.characters).toEqual(['c1', 'c2']);
    expect(
      wrapper
        .findAll('.character-row .character-name')
        .map((row) => row.text()),
    ).toEqual(['Aria', 'Bob']);

    await wrapper.findAll('.character-row-actions button')[1].trigger('click');
    expect(editState.draft?.characters).toEqual(['c1']);
    expect(editState.isEditMode).toBe(true);
    wrapper.unmount();
  });

  it('shows mentions only outside edit mode', async () => {
    const editState = reactive<InlineEditState<Party>>({
      isEditMode: false,
      isVisualMode: true,
      draft: null,
    });
    const wrapper = mountSidebar(editState);
    await flushPromises();

    expect(wrapper.findAll('.tab-item')).toHaveLength(3);
    expect(wrapper.find('.character-add-row').exists()).toBe(false);

    editState.isEditMode = true;
    await nextTick();

    expect(wrapper.findAll('.tab-item')).toHaveLength(2);
    expect(mocks.loadCharacters).toHaveBeenCalled();
    wrapper.unmount();
  });
});
