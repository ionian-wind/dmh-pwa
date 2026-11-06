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
vi.mock('@/stores/modules', async () => ({
  useModuleStore: () => mocks.stores.module,
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
  await makeStore('module');
  await makeStore('party');
  await makeStore('monster');
  await makeStore('encounter');
  await makeStore('character');
  await makeStore('location');

  mocks.stores.note.items.value = [
    { id: 'n1', moduleIds: [] },
    { id: 'n2', moduleIds: [] },
  ];
  mocks.stores.module.items.value = [{ id: 'm1' }, { id: 'm2' }];
  mocks.stores.party.items.value = [
    { id: 'p1', moduleIds: [], characters: [] },
    { id: 'p2', moduleIds: [], characters: [] },
  ];
  mocks.stores.character.items.value = [
    { id: 'c1', moduleIds: [] },
    { id: 'c2', moduleIds: [] },
  ];
  mocks.stores.monster.items.value = [
    { id: 'mo1', moduleIds: [] },
    { id: 'mo2', moduleIds: [] },
  ];
  mocks.stores.encounter.items.value = [
    { id: 'e1', moduleIds: [], monsters: {} },
    { id: 'e2', moduleIds: [], monsters: {} },
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
    await relations.loadFor('note', 'module');

    expect(mocks.stores.note.load).toHaveBeenCalled();
    expect(mocks.stores.module.load).toHaveBeenCalled();
    expect(relations.items('note')).toHaveLength(2);
  });

  it('links notes to modules and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.note.items.value[0].moduleIds = ['m1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'note', id: 'n1' },
    ];

    expect(relations.getLinkedIds('note', 'n1', 'module')).toEqual(['m1']);
    expect(relations.getLinkedIds('note', 'n1', 'location')).toEqual(['l1']);
    expect(relations.getLinkedIds('note', 'n1', 'character')).toEqual([]);

    await relations.setLinkedIds('note', 'n1', 'module', ['m2']);
    expect(mocks.stores.note.items.value[0].moduleIds).toEqual(['m2']);

    await relations.setLinkedIds('note', 'n1', 'location', []);
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);

    await relations.setLinkedIds('note', 'n1', 'location', ['l2']);
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'note', id: 'n1' },
    ]);
  });

  it('links modules to notes, parties, monsters, encounters, characters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.note.items.value[0].moduleIds = ['m1'];
    mocks.stores.party.items.value[0].moduleIds = ['m1'];
    mocks.stores.monster.items.value[0].moduleIds = ['m1'];
    mocks.stores.encounter.items.value[0].moduleIds = ['m1'];
    mocks.stores.character.items.value[0].moduleIds = ['m1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'module', id: 'm1' },
    ];

    expect(relations.getLinkedIds('module', 'm1', 'note')).toEqual(['n1']);
    expect(relations.getLinkedIds('module', 'm1', 'party')).toEqual(['p1']);
    expect(relations.getLinkedIds('module', 'm1', 'monster')).toEqual(['mo1']);
    expect(relations.getLinkedIds('module', 'm1', 'encounter')).toEqual(['e1']);
    expect(relations.getLinkedIds('module', 'm1', 'character')).toEqual(['c1']);
    expect(relations.getLinkedIds('module', 'm1', 'location')).toEqual(['l1']);

    await relations.setLinkedIds('module', 'm1', 'note', ['n2']);
    expect(mocks.stores.note.items.value[0].moduleIds).toEqual([]);
    expect(mocks.stores.note.items.value[1].moduleIds).toEqual(['m1']);

    await relations.setLinkedIds('module', 'm1', 'party', ['p2']);
    expect(mocks.stores.party.items.value[0].moduleIds).toEqual([]);
    expect(mocks.stores.party.items.value[1].moduleIds).toEqual(['m1']);

    await relations.setLinkedIds('module', 'm1', 'monster', ['mo2']);
    expect(mocks.stores.monster.items.value[0].moduleIds).toEqual([]);
    expect(mocks.stores.monster.items.value[1].moduleIds).toEqual(['m1']);

    await relations.setLinkedIds('module', 'm1', 'encounter', ['e2']);
    expect(mocks.stores.encounter.items.value[0].moduleIds).toEqual([]);
    expect(mocks.stores.encounter.items.value[1].moduleIds).toEqual(['m1']);

    await relations.setLinkedIds('module', 'm1', 'character', ['c2']);
    expect(mocks.stores.character.items.value[0].moduleIds).toEqual([]);
    expect(mocks.stores.character.items.value[1].moduleIds).toEqual(['m1']);

    await relations.setLinkedIds('module', 'm1', 'location', ['l2']);
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'module', id: 'm1' },
    ]);
  });

  it('links parties to modules, characters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.party.items.value[0].moduleIds = ['m1'];
    mocks.stores.party.items.value[0].characters = ['c1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'party', id: 'p1' },
    ];

    expect(relations.getLinkedIds('party', 'p1', 'module')).toEqual(['m1']);
    expect(relations.getLinkedIds('party', 'p1', 'character')).toEqual(['c1']);
    expect(relations.getLinkedIds('party', 'p1', 'location')).toEqual(['l1']);

    await relations.setLinkedIds('party', 'p1', 'module', ['m2']);
    await relations.setLinkedIds('party', 'p1', 'character', ['c2']);
    await relations.setLinkedIds('party', 'p1', 'location', []);
    expect(mocks.stores.party.items.value[0].moduleIds).toEqual(['m2']);
    expect(mocks.stores.party.items.value[0].characters).toEqual(['c2']);
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);
  });

  it('links characters to modules, parties and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.character.items.value[0].moduleIds = ['m1'];
    mocks.stores.party.items.value[0].characters = ['c1'];
    mocks.stores.location.items.value[0].entities = [
      { kind: 'character', id: 'c1' },
    ];

    expect(relations.getLinkedIds('character', 'c1', 'module')).toEqual(['m1']);
    expect(relations.getLinkedIds('character', 'c1', 'party')).toEqual(['p1']);
    expect(relations.getLinkedIds('character', 'c1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('character', 'c1', 'module', ['m2']);
    await relations.setLinkedIds('character', 'c1', 'party', ['p2']);
    await relations.setLinkedIds('character', 'c1', 'location', ['l2']);
    expect(mocks.stores.character.items.value[0].moduleIds).toEqual(['m2']);
    expect(mocks.stores.party.items.value[0].characters).toEqual([]);
    expect(mocks.stores.party.items.value[1].characters).toEqual(['c1']);
    expect(mocks.stores.location.items.value[1].entities).toEqual([
      { kind: 'character', id: 'c1' },
    ]);
  });

  it('links monsters to modules, encounters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.monster.items.value[0].moduleIds = ['m1'];
    mocks.stores.encounter.items.value[0].monsters = { mo1: 3 };
    mocks.stores.location.items.value[0].entities = [
      { kind: 'monster', id: 'mo1' },
    ];

    expect(relations.getLinkedIds('monster', 'mo1', 'module')).toEqual(['m1']);
    expect(relations.getLinkedIds('monster', 'mo1', 'encounter')).toEqual([
      'e1',
    ]);
    expect(relations.getLinkedIds('monster', 'mo1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('monster', 'mo1', 'module', ['m2']);
    await relations.setLinkedIds('monster', 'mo1', 'encounter', ['e2']);
    await relations.setLinkedIds('monster', 'mo1', 'location', []);
    expect(mocks.stores.monster.items.value[0].moduleIds).toEqual(['m2']);
    expect(mocks.stores.encounter.items.value[0].monsters).toEqual({});
    expect(mocks.stores.encounter.items.value[1].monsters).toEqual({
      mo1: 1,
    });
    expect(mocks.stores.location.items.value[0].entities).toEqual([]);
  });

  it('links encounters to modules, monsters and locations', async () => {
    const relations = useEntityLinkRelations();
    mocks.stores.encounter.items.value[0].moduleIds = ['m1'];
    mocks.stores.encounter.items.value[0].monsters = { mo1: 2 };
    mocks.stores.location.items.value[0].entities = [
      { kind: 'encounter', id: 'e1' },
    ];

    expect(relations.getLinkedIds('encounter', 'e1', 'module')).toEqual(['m1']);
    expect(relations.getLinkedIds('encounter', 'e1', 'monster')).toEqual([
      'mo1',
    ]);
    expect(relations.getLinkedIds('encounter', 'e1', 'location')).toEqual([
      'l1',
    ]);

    await relations.setLinkedIds('encounter', 'e1', 'module', ['m2']);
    await relations.setLinkedIds('encounter', 'e1', 'monster', ['mo2']);
    await relations.setLinkedIds('encounter', 'e1', 'location', ['l2']);
    expect(mocks.stores.encounter.items.value[0].moduleIds).toEqual(['m2']);
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
      { kind: 'module', id: 'm1' },
      { kind: 'party', id: 'p1' },
      { kind: 'monster', id: 'mo1' },
      { kind: 'encounter', id: 'e1' },
      { kind: 'character', id: 'c1' },
      { kind: 'location', id: 'l2' },
    ];

    for (const kind of [
      'note',
      'module',
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
