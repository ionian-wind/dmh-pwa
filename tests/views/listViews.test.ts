import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';

import CharactersView from '@/characters/CharactersView.vue';
import PawnsView from '@/pawns/PawnsView.vue';
import PartiesView from '@/parties/PartiesView.vue';
import NotesView from '@/notes/NotesView.vue';
import TimersView from '@/timers/TimersView.vue';
import EncountersView from '@/encounters/EncountersView.vue';

import { useCharacterStore } from '@/stores/characters';
import { usePawnStore } from '@/stores/pawns';
import { usePartyStore } from '@/stores/parties';
import { useNoteStore } from '@/stores/notes';
import { useTimerStore } from '@/stores/timers';
import { useEncounterStore } from '@/stores/encounters';
import { confirm } from '@/dialogs';
import { resetMockStores } from '../helpers/mock-storage';

vi.mock('@/utils/storage', () => import('../helpers/mock-storage'));
vi.mock('@/dialogs', () => ({
  confirm: vi.fn().mockResolvedValue(true),
  alert: vi.fn().mockResolvedValue(undefined),
  prompt: vi.fn(),
}));

const BaseListViewStub = defineComponent({
  name: 'BaseListView',
  props: {
    items: { type: Array, default: () => [] },
    cardProps: { type: Function, required: true },
    editorProps: { type: Function, required: true },
    searchQuery: { type: String, default: '' },
    headerButtons: { type: Array, default: () => [] },
    emptyMessage: { type: String, default: '' },
  },
  emits: [
    'update:searchQuery',
    'submit',
    'copy',
    'view',
    'delete',
    'tag-click',
    'start',
    'stop',
    'reset',
    'run-combat',
  ],
  setup(_, { slots, expose }) {
    expose({ openCreate: vi.fn() });
    return () => h('div', { 'data-stub': 'BaseListView' }, slots.default?.());
  },
});

const PartySelectorStub = defineComponent({
  name: 'PartySelector',
  props: { isOpen: Boolean, encounter: Object },
  emits: ['cancel', 'combat-created'],
  setup() {
    return () => h('div', { 'data-stub': 'PartySelector' });
  },
});

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { render: () => h('div') } },
      { path: '/characters/:id', component: { render: () => h('div') } },
      { path: '/pawns/:id', component: { render: () => h('div') } },
      { path: '/parties/:id', component: { render: () => h('div') } },
      { path: '/notes', component: { render: () => h('div') } },
      { path: '/notes/:id', component: { render: () => h('div') } },
      { path: '/encounters/:id', component: { render: () => h('div') } },
      { path: '/combats/:id', component: { render: () => h('div') } },
    ],
  });
}

async function mountView(component: any, path = '/') {
  const router = makeRouter();
  await router.push(path);
  await router.isReady();

  const wrapper = mount(component, {
    global: {
      plugins: [router],
      stubs: {
        BaseListView: BaseListViewStub,
        PartySelector: PartySelectorStub,
      },
    },
  });
  await flushPromises();
  return { wrapper, router };
}

function list(wrapper: any) {
  return wrapper.findComponent(BaseListViewStub);
}

describe('list views', () => {
  beforeEach(() => {
    resetMockStores();
    vi.mocked(confirm).mockResolvedValue(true);
  });

  it('handles character card actions, submit, copy and delete', async () => {
    const { wrapper, router } = await mountView(CharactersView, '/');
    const store = useCharacterStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    const character = {
      id: 'c1',
      name: 'Aria',
      createdAt: 0,
      updatedAt: 0,
    } as any;
    const props = list(wrapper).props('cardProps') as any;
    const card = props(character);
    card.onView();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/characters/c1');
    card.onEdit();

    await expect(card.onDelete()).resolves.toBe(true);
    expect(store.remove).toHaveBeenCalledWith('c1');

    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);

    const listVm = list(wrapper).vm;
    listVm.$emit('submit', character);
    listVm.$emit('submit', { name: 'New' });
    listVm.$emit('copy', character);
    await flushPromises();
    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('handles pawn card actions and submit', async () => {
    const { wrapper, router } = await mountView(PawnsView, '/');
    const store = usePawnStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    const pawn = { id: 'm1', name: 'Goblin' } as any;
    const card = (list(wrapper).props('cardProps') as any)(pawn);
    card.onView();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/pawns/m1');

    (list(wrapper).props('editorProps') as any)(pawn);
    await expect(card.onDelete()).resolves.toBe(true);
    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);

    list(wrapper).vm.$emit('submit', pawn);
    list(wrapper).vm.$emit('submit', { name: 'Orc' });
    list(wrapper).vm.$emit('copy', pawn);
    await flushPromises();
    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledTimes(2);
    expect(store.remove).toHaveBeenCalledWith('m1');
    wrapper.unmount();
  });

  it('handles party card actions and submit', async () => {
    const { wrapper, router } = await mountView(PartiesView, '/');
    const store = usePartyStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    const party = { id: 'p1', name: 'Heroes' } as any;
    const card = (list(wrapper).props('cardProps') as any)(party);
    card.onView();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/parties/p1');

    (list(wrapper).props('editorProps') as any)(party);
    await expect(card.onDelete()).resolves.toBe(true);
    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);

    list(wrapper).vm.$emit('submit', party);
    list(wrapper).vm.$emit('submit', { name: 'Villains' });
    list(wrapper).vm.$emit('copy', party);
    await flushPromises();
    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledTimes(2);
    expect(store.remove).toHaveBeenCalledWith('p1');
    wrapper.unmount();
  });

  it('handles note actions and tag filters', async () => {
    const { wrapper, router } = await mountView(NotesView, '/notes');
    const store = useNoteStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    const setTagFilter = vi.spyOn(store, 'setTagFilter');

    const note = { id: 'n1', title: 'Session', tags: ['combat'] } as any;
    const card = (list(wrapper).props('cardProps') as any)(note);
    card.onView();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/notes/n1');
    card.onEdit();

    expect(list(wrapper).props('emptyMessage')).toContain(
      'Create your first note',
    );
    expect(list(wrapper).props('headerButtons') ?? []).toEqual([]);
    expect((list(wrapper).props('editorProps') as any)(null)).toMatchObject({
      note: null,
      isOpen: true,
    });

    list(wrapper).vm.$emit('submit', note);
    list(wrapper).vm.$emit('submit', { title: 'New note' });
    list(wrapper).vm.$emit('copy', note);
    list(wrapper).vm.$emit('tag-click', 'combat');
    await flushPromises();

    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'New note' }),
    );
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Session' }),
    );
    expect(router.currentRoute.value.query.tag).toBe('combat');

    list(wrapper).vm.$emit('cancel');
    await expect(card.onDelete()).resolves.toBe(true);
    expect(store.remove).toHaveBeenCalledWith('n1');
    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);

    await router.replace('/notes?tag=social');
    await flushPromises();
    expect(setTagFilter).toHaveBeenCalledWith('social');
    wrapper.unmount();
  });

  it('handles timer actions and lifecycle callbacks', async () => {
    const { wrapper } = await mountView(TimersView, '/');
    const store = useTimerStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);
    vi.spyOn(store, 'start').mockResolvedValue(undefined);
    vi.spyOn(store, 'stop').mockResolvedValue(undefined);
    vi.spyOn(store, 'reset').mockResolvedValue(undefined);

    const timer = { id: 't1', title: 'Round', duration: 60 } as any;
    const card = (list(wrapper).props('cardProps') as any)(timer);
    card.onEdit();
    card.onStart();
    card.onStop();
    card.onReset();
    expect(store.start).toHaveBeenCalledWith('t1');
    expect(store.stop).toHaveBeenCalledWith('t1');
    expect(store.reset).toHaveBeenCalledWith('t1');

    (list(wrapper).props('editorProps') as any)(timer);
    await expect(card.onDelete()).resolves.toBe(true);
    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);

    list(wrapper).vm.$emit('submit', timer);
    list(wrapper).vm.$emit('submit', { title: 'New timer' });
    await flushPromises();
    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'inactive', startedAt: null }),
    );
    expect(store.remove).toHaveBeenCalledWith('t1');
    wrapper.unmount();
  });

  it('handles encounter actions and run-combat flow', async () => {
    const { wrapper, router } = await mountView(EncountersView, '/');
    const store = useEncounterStore();
    vi.spyOn(store, 'create').mockResolvedValue({} as any);
    vi.spyOn(store, 'update').mockResolvedValue({} as any);
    vi.spyOn(store, 'remove').mockResolvedValue(undefined);

    const encounter = { id: 'e1', name: 'Ambush' } as any;
    const card = (list(wrapper).props('cardProps') as any)(encounter);
    card.onView();
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/encounters/e1');

    card.onRunCombat();
    await nextTick();
    const selector = wrapper.findComponent(PartySelectorStub);
    expect(selector.props('isOpen')).toBe(true);
    expect(selector.props('encounter')).toEqual(encounter);

    selector.vm.$emit('combat-created', { id: 'combat-1' });
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/combats/combat-1');
    expect(wrapper.findComponent(PartySelectorStub).props('isOpen')).toBe(
      false,
    );

    card.onRunCombat();
    await nextTick();
    wrapper.findComponent(PartySelectorStub).vm.$emit('cancel');
    await nextTick();
    expect(wrapper.findComponent(PartySelectorStub).props('isOpen')).toBe(
      false,
    );

    list(wrapper).vm.$emit('submit', encounter);
    list(wrapper).vm.$emit('submit', { name: 'New encounter' });
    list(wrapper).vm.$emit('copy', encounter);
    await flushPromises();
    expect(store.update).toHaveBeenCalled();
    expect(store.create).toHaveBeenCalledTimes(2);
    await expect(card.onDelete()).resolves.toBe(true);
    expect(store.remove).toHaveBeenCalledWith('e1');
    vi.mocked(confirm).mockResolvedValue(false);
    await expect(card.onDelete()).resolves.toBe(false);
    wrapper.unmount();
  });
});
