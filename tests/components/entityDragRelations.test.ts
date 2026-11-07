import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ stores: {} as Record<string, any> }));

async function makeStore(kind: string) {
  const { ref } = await import('vue');
  const store = {
    items: ref<any[]>([]),
    load: vi.fn().mockResolvedValue(undefined),
    getById: (id: string) => store.items.value.find((item) => item.id === id),
    update: vi.fn(async (id: string, patch: Record<string, any>) => {
      const item = store.items.value.find((entry) => entry.id === id);
      if (item) Object.assign(item, patch);
      return item;
    }),
  };
  mocks.stores[kind] = store;
  return store;
}

vi.mock('@/stores/notes', async () => ({
  useNoteStore: () => mocks.stores.note,
}));
vi.mock('@/stores/parties', async () => ({
  usePartyStore: () => mocks.stores.party,
}));
vi.mock('@/stores/characters', async () => ({
  useCharacterStore: () => mocks.stores.character,
}));
vi.mock('@/stores/monsters', async () => ({
  useMonsterStore: () => mocks.stores.monster,
}));
vi.mock('@/stores/encounters', async () => ({
  useEncounterStore: () => mocks.stores.encounter,
}));
vi.mock('@/maps/locations', async () => ({
  useMapLocationStore: () => mocks.stores.location,
}));

import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';

async function seedStores() {
  await makeStore('note');
  await makeStore('party');
  await makeStore('monster');
  await makeStore('encounter');
  await makeStore('character');
  await makeStore('location');

  mocks.stores.note.items.value = [{ id: 'n1' }, { id: 'n2' }];
  mocks.stores.party.items.value = [
    { id: 'p1', characters: [] },
    { id: 'p2', characters: [] },
  ];
  mocks.stores.character.items.value = [{ id: 'c1' }, { id: 'c2' }];
  mocks.stores.monster.items.value = [{ id: 'mo1' }, { id: 'mo2' }];
  mocks.stores.encounter.items.value = [
    { id: 'e1', monsters: {} },
    { id: 'e2', monsters: {} },
  ];
  mocks.stores.location.items.value = [
    { id: 'l1', entities: [] },
    { id: 'l2', entities: [] },
  ];
}

describe('entity drag link relations', () => {
  beforeEach(async () => {
    await seedStores();
  });

  it('loads source and target stores', async () => {
    const relations = useEntityLinkRelations();
    await relations.loadFor('note', 'location');

    expect(mocks.stores.note.load).toHaveBeenCalled();
    expect(mocks.stores.location.load).toHaveBeenCalled();
    expect(relations.items('note')).toHaveLength(2);
  });

  it('links notes to locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.location.items.value[0].entities = [
      { kind: 'note', id: 'n1' },
    ];

    expect(relations.getLinkedIds('note', 'n1', 'location')).toEqual(['l1']);
    expect(relations.getLinkedIds('note', 'n1', 'character')).toEqual([]);

    await relations.setLinkedIds('note', 'n1', 'location', []);
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);

    await relations.setLinkedIds('note', 'n1', 'location', ['l2']);
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'note', id: 'n1' },
    ]);
  });

  it('links parties to characters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.party.items.value[0].characters = ['c1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'party', id: 'p1' },
    ];

    expect(relations.getLinkedIds('party', 'p1', 'character')).toEqual(['c1']);
    expect(relations.getLinkedIds('party', 'p1', 'location')).toEqual(['l1']);

    await relations.setLinkedIds('party', 'p1', 'character', ['c2']);
    await relations.setLinkedIds('party', 'p1', 'location', []);
    expect(mocks.stores.party.items.value[0].characters).toEqual(['c2']);
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);
  });

  it('links characters to parties and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.party.items.value[0].characters = ['c1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'character', id: 'c1' },
    ];

    expect(relations.getLinkedIds('character', 'c1', 'party')).toEqual(['p1']);
    expect(relations.getLinkedIds('character', 'c1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('character', 'c1', 'party', ['p2']);
    await relations.setLinkedIds('character', 'c1', 'location', ['l2']);
    expect(mocks.stores.party.items.value[0].characters).toEqual([]);
    expect(mocks.stores.party.items.value[1].characters).toEqual(['c1']);
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'character', id: 'c1' },
    ]);
  });

  it('links monsters to encounters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.encounter.items.value[0].monsters = { mo1: 3 };
    mocks.stores.location.items.value[0].entities = [
      { kind: 'monster', id: 'mo1' },
    ];

    expect(relations.getLinkedIds('monster', 'mo1', 'encounter')).toEqual([
      'e1',
    ]);
    expect(relations.getLinkedIds('monster', 'mo1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('monster', 'mo1', 'encounter', ['e2']);
    await relations.setLinkedIds('monster', 'mo1', 'location', []);
    expect(mocks.stores.encounter.items.value[0].monsters).toEqual({});
    expect(mocks.stores.encounter.items.value[1].monsters).toEqual({
      mo1: 1,
    });
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);
  });

  it('links encounters to monsters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.encounter.items.value[0].monsters = { mo1: 2 };
    mocks.stores.location.items.value[0].entities = [
      { kind: 'encounter', id: 'e1' },
    ];

    expect(relations.getLinkedIds('encounter', 'e1', 'monster')).toEqual([
      'mo1',
    ]);
    expect(relations.getLinkedIds('encounter', 'e1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('encounter', 'e1', 'monster', ['mo2']);
    await relations.setLinkedIds('encounter', 'e1', 'location', ['l2']);
    expect(mocks.stores.encounter.items.value[0].monsters).toEqual({
      mo2: 1,
    });
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'encounter', id: 'e1' },
    ]);
  });

  it('links locations to arbitrary entity kinds', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.location.items.value[0].entities = [
      { kind: 'note', id: 'n1' },
      { kind: 'party', id: 'p1' },
      { kind: 'monster', id: 'mo1' },
      { kind: 'encounter', id: 'e1' },
      { kind: 'character', id: 'c1' },
      { kind: 'location', id: 'l2' },
    ];

    for (const kind of [
      'note',
      'party',
      'monster',
      'encounter',
      'character',
      'location',
    ] as const) {
      expect(
        relations.getLinkedIds('location', 'l1', kind).length,
      ).toBeGreaterThan(0);
    }

    await relations.setLinkedIds('location', 'l1', 'note', ['n2']);
    expect(mocks.stores.location.items.value[0].entities).toContainEqual({
      kind: 'note',
      id: 'n2',
    });
    expect(mocks.stores.location.items.value[0].entities).not.toContainEqual({
      kind: 'note',
      id: 'n1',
    });

    await relations.setLinkedIds('location', 'l1', 'location', ['l1']);
    expect(mocks.stores.location.items.value[0].entities).not.toContainEqual({
      kind: 'location',
      id: 'l1',
    });
  });
});
