import { describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick, reactive } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';
import type { InlineEditState, Encounter } from '@/types';

const mocks = vi.hoisted(() => ({
  getLinks: vi.fn(() => []),
  getBacklinks: vi.fn(() => []),
  loadMentions: vi.fn().mockResolvedValue(undefined),
  loadPawns: vi.fn().mockResolvedValue(undefined),
  pawns: [] as any[],
  updateEncounter: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/utils/storage', () => ({
  useMentionsStore: () => ({
    getLinks: mocks.getLinks,
    getBacklinks: mocks.getBacklinks,
    load: mocks.loadMentions,
  }),
}));

vi.mock('@/stores/pawns', () => ({
  usePawnStore: () => ({
    filtered: mocks.pawns,
    load: mocks.loadPawns,
  }),
}));

vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => ({
    update: mocks.updateEncounter,
  }),
}));

import EncounterViewSidebar from '@/encounters/EncounterViewSidebar.vue';

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

const EntityInfoDialogStub = defineComponent({
  name: 'EntityInfoDialog',
  props: {
    isOpen: Boolean,
    title: String,
    picture: String,
    notes: String,
    to: String,
    entityKind: String,
    entityId: String,
  },
  setup: () => () => h('div', { class: 'entity-info-dialog-stub' }),
});

function mountSidebar(
  editState: InlineEditState<Encounter>,
  onSetEditMode = vi.fn(),
  onRunCombat = vi.fn(),
  onDelete = vi.fn(),
) {
  return mount(EncounterViewSidebar, {
    props: {
      encounter: {
        id: 'encounter-1',
        name: 'Ambush',
        description: '',
        pawns: {},
        createdAt: 1,
        updatedAt: 1,
      },
      editState,
      onSetEditMode,
      onRunCombat,
      onDelete,
    },
    global: {
      stubs: {
        Mentions: MentionsStub,
        EntityScenesPanel: ScenesStub,
        EntityInfoDialog: EntityInfoDialogStub,
        RouterLink: true,
      },
    },
  });
}

describe('EncounterViewSidebar', () => {
  it('toggles edit mode through the shared controls', async () => {
    const editState = reactive<InlineEditState<Encounter>>({
      isEditMode: false,
      isVisualMode: true,
      draft: null,
    });
    const onSetEditMode = vi.fn();
    const onRunCombat = vi.fn();
    const onDelete = vi.fn();
    const wrapper = mountSidebar(
      editState,
      onSetEditMode,
      onRunCombat,
      onDelete,
    );
    await flushPromises();

    expect(wrapper.find('.entity-mode-controls').exists()).toBe(true);
    expect(wrapper.find('.run-combat-button').exists()).toBe(true);
    expect(wrapper.find('.entity-delete-button').exists()).toBe(false);
    await wrapper.find('.run-combat-button').trigger('click');
    expect(onRunCombat).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.tab-item')).toHaveLength(3);
    expect(wrapper.find('.pawn-add-row').exists()).toBe(false);

    await wrapper.find('.entity-edit-mode').trigger('click');
    expect(onSetEditMode).toHaveBeenCalledWith(true);

    editState.isEditMode = true;
    await nextTick();

    expect(wrapper.find('.run-combat-button').exists()).toBe(false);
    expect(wrapper.find('.entity-delete-button').exists()).toBe(true);
    await wrapper.find('.entity-delete-button').trigger('click');
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.tab-item')).toHaveLength(2);
    expect(wrapper.find('.pawn-add-row').exists()).toBe(true);
    expect(wrapper.find('.entity-visual-mode-toggle').exists()).toBe(true);
    expect(wrapper.findComponent(ScenesStub).props('editable')).toBe(true);
    wrapper.unmount();
  });

  it('shows only the scenes panel in scenes-only mode', async () => {
    vi.clearAllMocks();
    const encounter: Encounter = {
      id: 'encounter-1',
      name: 'Ambush',
      description: '',
      pawns: {},
      createdAt: 1,
      updatedAt: 1,
    };

    const wrapper = mount(EncounterViewSidebar, {
      props: { encounter, scenesOnly: true },
      global: {
        stubs: {
          Mentions: MentionsStub,
          EntityScenesPanel: ScenesStub,
          EntityInfoDialog: EntityInfoDialogStub,
          RouterLink: true,
        },
      },
    });
    await flushPromises();

    expect(wrapper.findComponent(ScenesStub).exists()).toBe(true);
    expect(wrapper.findComponent(ScenesStub).props()).toMatchObject({
      entityType: 'encounter',
      entityId: 'encounter-1',
    });
    expect(wrapper.findAll('.tab-item')).toHaveLength(0);
    expect(wrapper.find('.run-combat-button').exists()).toBe(false);
    expect(wrapper.find('.entity-mode-controls').exists()).toBe(false);
    expect(mocks.loadMentions).not.toHaveBeenCalled();
    expect(mocks.loadPawns).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('only exposes pawn actions in edit mode', async () => {
    mocks.pawns = [
      {
        id: 'pawn-1',
        name: 'Goblin',
        picture: 'picture-1',
        notes: 'Fierce little creature',
      },
    ];
    const encounter: Encounter = {
      id: 'encounter-1',
      name: 'Ambush',
      description: '',
      pawns: { 'pawn-1': 2 },
      createdAt: 1,
      updatedAt: 1,
    };
    const viewState = reactive<InlineEditState<Encounter>>({
      isEditMode: false,
      isVisualMode: true,
      draft: null,
    });

    const view = mount(EncounterViewSidebar, {
      props: { encounter, editState: viewState },
      global: {
        stubs: {
          Mentions: MentionsStub,
          EntityScenesPanel: ScenesStub,
          EntityInfoDialog: EntityInfoDialogStub,
          RouterLink: true,
        },
      },
    });
    await flushPromises();

    expect(view.find('.pawn-row').text()).toContain('2');
    expect(view.find('.pawn-row button[title="Unlink"]').exists()).toBe(false);

    await view.find('.pawn-row').trigger('click');
    const dialog = view.findComponent(EntityInfoDialogStub);
    expect(dialog.props()).toMatchObject({
      isOpen: true,
      title: 'Goblin',
      picture: 'picture-1',
      notes: 'Fierce little creature',
      entityKind: 'pawn',
      entityId: 'pawn-1',
    });

    viewState.isEditMode = true;
    await nextTick();

    expect(view.find('.pawn-row button[title="Unlink"]').exists()).toBe(true);
    view.unmount();
  });
});
