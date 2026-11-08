import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, reactive, unref } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

const mocks = vi.hoisted(() => ({
  route: { params: { id: 'combat-1' } },
  routerPush: vi.fn(),
  rightDrawerSet: vi.fn(),
  rightDrawerClear: vi.fn(),
  combats: {
    items: [] as any[],
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    update: vi.fn(),
    getById: vi.fn((id: string) =>
      mocks.combats.items.find((item: any) => item.id === id),
    ),
  },
  encounters: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) =>
      id === 'enc-1' ? { id, name: 'Ambush' } : null,
    ),
  },
  parties: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) =>
      id === 'party-1'
        ? { id, name: 'Heroes', characters: ['c1', 'c2'] }
        : null,
    ),
  },
  characters: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn((id: string) => {
      if (id === 'c1') return { id, name: 'Aria', notes: 'Ranger' };
      if (id === 'c2') return { id, name: 'Bob', notes: 'Wizard' };
      return null;
    }),
  },
  pawns: {
    isLoaded: true,
    load: vi.fn().mockResolvedValue(undefined),
    getById: vi.fn(() => null),
  },
}));

const combat = {
  id: 'combat-1',
  encounterId: 'enc-1',
  partyId: 'party-1',
  status: 'preparing',
  currentRound: 1,
  currentTurn: 0,
  combatants: [
    {
      id: 'c1',
      type: 'player',
      referenceId: 'c1',
      notes: '',
      initiative: 5,
      hasActed: false,
      isPostponed: false,
      createdAt: 1,
      updatedAt: 1,
    },
  ],
  createdAt: 1,
  updatedAt: 1,
};

vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<any>()),
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.routerPush }),
}));

vi.mock('@/stores/combats', () => ({ useCombatStore: () => mocks.combats }));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => mocks.encounters,
}));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => mocks.parties }));
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => mocks.characters,
}));
vi.mock('@/stores/pawns', () => ({ usePawnStore: () => mocks.pawns }));
vi.mock('@/composables/useLayout', () => ({
  useRightDrawer: () => ({
    set: mocks.rightDrawerSet,
    clear: mocks.rightDrawerClear,
  }),
}));

import CombatView from '@/encounters/CombatView.vue';
import EncounterViewSidebar from '@/encounters/EncounterViewSidebar.vue';

const BaseEntityViewStub = defineComponent({
  name: 'BaseEntityView',
  props: [
    'entity',
    'entityName',
    'listRoute',
    'title',
    'notFound',
    'loading',
    'headerShowEdit',
    'headerShowDelete',
    'headerButtons',
  ],
  setup(_, { slots }) {
    return () =>
      h('div', { class: 'base-entity-view-stub' }, slots.default?.());
  },
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
  setup() {
    return () => h('div', { class: 'entity-linking-dialog-stub' });
  },
});

const EntityInfoDialogStub = defineComponent({
  name: 'EntityInfoDialog',
  props: ['isOpen', 'title', 'picture', 'notes', 'to'],
  emits: ['cancel'],
  setup() {
    return () => h('div', { class: 'entity-info-dialog-stub' });
  },
});

function mountView() {
  return mount(CombatView, {
    global: {
      stubs: {
        BaseEntityView: BaseEntityViewStub,
        EntityLinkingDialog: EntityLinkingDialogStub,
        EntityInfoDialog: EntityInfoDialogStub,
      },
    },
  });
}

describe('CombatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.combats.items = reactive([structuredClone(combat)]);
    mocks.combats.update.mockImplementation(
      async (_id: string, patch: Record<string, unknown>) => ({
        ...mocks.combats.items[0],
        ...patch,
      }),
    );
  });

  it('shows the encounter scenes in the right sidebar', async () => {
    mountView();
    await flushPromises();

    expect(mocks.rightDrawerSet).toHaveBeenCalledWith(
      expect.objectContaining({
        component: EncounterViewSidebar,
        props: expect.objectContaining({ scenesOnly: true }),
      }),
    );
    const props = mocks.rightDrawerSet.mock.calls[0][0].props;
    expect(unref(props.encounter)).toMatchObject({ id: 'enc-1' });
  });

  it('adds characters through the character linking dialog', async () => {
    const wrapper = mountView();
    await flushPromises();

    const dialog = wrapper.findComponent(EntityLinkingDialogStub);
    expect(dialog.props()).toMatchObject({
      isOpen: false,
      kind: 'character',
      multiple: true,
      linkedIds: [],
      options: [{ id: 'c2', label: 'Bob' }],
    });

    await wrapper.find('.combat-title button').trigger('click');
    expect(dialog.props('isOpen')).toBe(true);

    dialog.vm.$emit('add', { refs: [{ kind: 'character', id: 'c2' }] });
    await flushPromises();

    expect(mocks.combats.update).toHaveBeenCalledWith(
      'combat-1',
      expect.objectContaining({
        combatants: expect.arrayContaining([
          expect.objectContaining({
            id: 'c2',
            type: 'player',
            referenceId: 'c2',
            initiative: 0,
          }),
        ]),
      }),
    );
    wrapper.unmount();
  });

  it('clears the sidebar when the combat view unmounts', async () => {
    const wrapper = mountView();
    await flushPromises();

    wrapper.unmount();

    expect(mocks.rightDrawerClear).toHaveBeenCalledTimes(1);
  });
});
