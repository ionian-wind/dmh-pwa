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

vi.mock('@/stores/notes', () => ({
  useNoteStore: () => mocks.stores.note,
}));
vi.mock('@/stores/parties', () => ({
  usePartyStore: () => mocks.stores.party,
}));
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => mocks.stores.character,
}));
vi.mock('@/stores/pawns', () => ({
  usePawnStore: () => mocks.stores.pawn,
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => mocks.stores.encounter,
}));
vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => mocks.stores.location,
}));
vi.mock('@/jukebox/stores', () => ({
  useJukeboxPlaylistsStore: () => mocks.stores.playlist,
}));

import { useEntityLinkRelations } from '@/components/common/entityDragLinking/relations';

async function seedStores() {
  await makeStore('note');
  await makeStore('party');
  await makeStore('pawn');
  await makeStore('encounter');
  await makeStore('character');
  await makeStore('location');
  await makeStore('playlist');

  mocks.stores.note.items.value = [
    { id: 'n1', links: [] },
    { id: 'n2', links: [] },
    { id: 'n3' },
  ];
  mocks.stores.party.items.value = [
    { id: 'p1', characters: ['c1'] },
    { id: 'p2', characters: [] },
    { id: 'p3' },
  ];
  mocks.stores.character.items.value = [{ id: 'c1' }, { id: 'c2' }];
  mocks.stores.pawn.items.value = [{ id: 'mo1' }, { id: 'mo2' }];
  mocks.stores.encounter.items.value = [
    { id: 'e1', pawns: { mo1: 3 } },
    { id: 'e2', pawns: {} },
    { id: 'e3' },
  ];
  mocks.stores.location.items.value = [
    { id: 'l1', entities: [] },
    { id: 'l2', entities: [] },
    { id: 'l3' },
  ];
  mocks.stores.playlist.items.value = [
    { id: 'pl1', links: [{ kind: 'note', id: 'n1' }] },
    { id: 'pl2', links: [] },
    { id: 'pl3' },
  ];
}

describe('entity drag link relations branch coverage', () => {
  beforeEach(async () => {
    await seedStores();
  });

  it('returns early for unknown source or target kinds', async () => {
    const relations = useEntityLinkRelations();

    await expect(
      relations.loadFor('bogus' as any, 'note'),
    ).resolves.toBeUndefined();
    await expect(
      relations.loadFor('note', 'bogus' as any),
    ).resolves.toBeUndefined();
    expect(mocks.stores.note.load).not.toHaveBeenCalled();

    expect(relations.getLinkedIds('bogus' as any, 'n1', 'note')).toEqual([]);
    expect(relations.getLinkedIds('note', 'n1', 'bogus' as any)).toEqual([]);

    await expect(
      relations.setLinkedIds('bogus' as any, 'n1', 'note', ['n2']),
    ).resolves.toBeUndefined();
  });

  it('handles playlist links in both directions', async () => {
    const relations = useEntityLinkRelations();

    expect(relations.getLinkedIds('note', 'n1', 'playlist')).toEqual(['pl1']);
    expect(relations.getLinkedIds('note', 'n2', 'playlist')).toEqual([]);
    expect(relations.getLinkedIds('playlist', 'pl1', 'note')).toEqual(['n1']);
    expect(relations.getLinkedIds('playlist', 'missing', 'note')).toEqual([]);

    await relations.setLinkedIds('playlist', 'pl1', 'note', ['n2']);
    expect(mocks.stores.playlist.items.value[0].links).toEqual([
      { kind: 'note', id: 'n2' },
    ]);

    await relations.setLinkedIds('playlist', 'pl3', 'party', ['p1']);
    expect(mocks.stores.playlist.update).toHaveBeenLastCalledWith('pl3', {
      links: [{ kind: 'party', id: 'p1' }],
    });

    await relations.setLinkedIds('note', 'n2', 'playlist', ['pl2']);
    expect(mocks.stores.playlist.items.value[0].links).toEqual([]);
    expect(mocks.stores.playlist.items.value[1].links).toEqual([
      { kind: 'note', id: 'n2' },
    ]);
    expect(mocks.stores.playlist.items.value[2].links).toEqual([
      { kind: 'party', id: 'p1' },
    ]);
  });

  it('handles notes without links and ignores note-to-note edits', async () => {
    const relations = useEntityLinkRelations();

    expect(relations.getLinkedIds('note', 'n3', 'party')).toEqual([]);
    expect(relations.getLinkedIds('note', 'n3', 'character')).toEqual([]);

    await relations.setLinkedIds('note', 'n3', 'party', ['p1']);
    expect(mocks.stores.note.update).toHaveBeenLastCalledWith('n3', {
      links: [{ kind: 'party', id: 'p1' }],
    });

    mocks.stores.note.update.mockClear();
    await relations.setLinkedIds('note', 'n1', 'note', ['n2']);
    expect(mocks.stores.note.update).not.toHaveBeenCalled();
  });

  it('handles missing optional collections', async () => {
    const relations = useEntityLinkRelations();

    expect(relations.getLinkedIds('party', 'p3', 'character')).toEqual([]);
    expect(relations.getLinkedIds('party', 'p3', 'location')).toEqual([]);
    expect(relations.getLinkedIds('party', 'p1', 'encounter')).toEqual([]);

    expect(relations.getLinkedIds('character', 'c1', 'party')).toEqual(['p1']);
    expect(relations.getLinkedIds('character', 'c2', 'party')).toEqual([]);
    expect(relations.getLinkedIds('character', 'c1', 'location')).toEqual([]);

    expect(relations.getLinkedIds('pawn', 'mo1', 'encounter')).toEqual(['e1']);
    expect(relations.getLinkedIds('pawn', 'mo2', 'encounter')).toEqual([]);
    expect(relations.getLinkedIds('pawn', 'mo1', 'location')).toEqual([]);

    expect(relations.getLinkedIds('encounter', 'e1', 'pawn')).toEqual(['mo1']);
    expect(relations.getLinkedIds('encounter', 'e3', 'pawn')).toEqual([]);
    expect(relations.getLinkedIds('encounter', 'e1', 'location')).toEqual([]);

    expect(relations.getLinkedIds('location', 'l3', 'note')).toEqual([]);
  });

  it('updates a location whose entities field is absent', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('location', 'l3', 'note', ['n1']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'note', id: 'n1' },
    ]);
  });

  it('adds and removes location entities when the list is missing', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('note', 'n1', 'location', ['l3']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'note', id: 'n1' },
    ]);

    await relations.setLinkedIds('note', 'n1', 'location', []);
    expect(mocks.stores.location.items.value[2].entities).toEqual([]);

    await relations.setLinkedIds('location', 'l3', 'note', ['n1']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'note', id: 'n1' },
    ]);
    await relations.setLinkedIds('location', 'l3', 'note', ['n2']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'note', id: 'n2' },
    ]);
    await relations.setLinkedIds('location', 'l3', 'note', []);
    expect(mocks.stores.location.items.value[2].entities).toEqual([]);

    await relations.setLinkedIds('party', 'p3', 'location', ['l3']);
    await relations.setLinkedIds('character', 'c2', 'location', ['l3']);
    await relations.setLinkedIds('pawn', 'mo2', 'location', ['l3']);
    await relations.setLinkedIds('encounter', 'e3', 'location', ['l3']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'party', id: 'p3' },
      { kind: 'character', id: 'c2' },
      { kind: 'pawn', id: 'mo2' },
      { kind: 'encounter', id: 'e3' },
    ]);

    await relations.setLinkedIds('location', 'l3', 'note', ['n1']);
    expect(mocks.stores.location.items.value[2].entities).toEqual([
      { kind: 'party', id: 'p3' },
      { kind: 'character', id: 'c2' },
      { kind: 'pawn', id: 'mo2' },
      { kind: 'encounter', id: 'e3' },
      { kind: 'note', id: 'n1' },
    ]);
  });

  it('updates character-party membership with missing arrays', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('character', 'c2', 'party', ['p3']);
    expect(mocks.stores.party.items.value[0].characters).toEqual(['c1']);
    expect(mocks.stores.party.items.value[1].characters).toEqual([]);
    expect(mocks.stores.party.items.value[2].characters).toEqual(['c2']);

    await relations.setLinkedIds('character', 'c2', 'party', []);
    expect(mocks.stores.party.items.value[2].characters).toEqual([]);
  });

  it('updates pawn encounters with missing maps and fallback counts', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('pawn', 'mo2', 'encounter', ['e3']);
    expect(mocks.stores.encounter.items.value[2].pawns).toEqual({ mo2: 1 });

    mocks.stores.encounter.items.value[2].pawns = {
      mo1: 0,
      mo2: 2,
    };
    await relations.setLinkedIds('pawn', 'mo2', 'encounter', ['e2']);
    expect(mocks.stores.encounter.items.value[2].pawns).toEqual({ mo1: 0 });
    expect(mocks.stores.encounter.items.value[1].pawns).toEqual({ mo2: 1 });
  });

  it('rebuilds encounter pawn maps from selected pawns', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('encounter', 'e3', 'pawn', ['mo1']);
    expect(mocks.stores.encounter.items.value[2].pawns).toEqual({ mo1: 1 });

    mocks.stores.encounter.items.value[2].pawns = { mo1: 2 };
    await relations.setLinkedIds('encounter', 'e3', 'pawn', [
      'mo1',
      'mo2',
      'mo3',
    ]);
    expect(mocks.stores.encounter.items.value[2].pawns).toEqual({
      mo1: 2,
      mo2: 1,
      mo3: 1,
    });

    mocks.stores.encounter.items.value[2].pawns = { mo1: 0, mo2: 0 };
    await relations.setLinkedIds('encounter', 'e3', 'pawn', ['mo1', 'mo2']);
    expect(mocks.stores.encounter.items.value[2].pawns).toEqual({
      mo1: 1,
      mo2: 1,
    });
  });

  it('updates note links for all linkable source kinds', async () => {
    const relations = useEntityLinkRelations();

    await relations.setLinkedIds('character', 'c1', 'note', ['n2']);
    expect(mocks.stores.note.items.value[1].links).toContainEqual({
      kind: 'character',
      id: 'c1',
    });

    await relations.setLinkedIds('pawn', 'mo1', 'note', ['n2']);
    await relations.setLinkedIds('encounter', 'e1', 'note', ['n2']);
    await relations.setLinkedIds('party', 'p1', 'note', ['n2']);
    expect(mocks.stores.note.items.value[1].links).toEqual(
      expect.arrayContaining([
        { kind: 'character', id: 'c1' },
        { kind: 'pawn', id: 'mo1' },
        { kind: 'encounter', id: 'e1' },
        { kind: 'party', id: 'p1' },
      ]),
    );

    await relations.setLinkedIds('party', 'p1', 'note', []);
    expect(
      mocks.stores.note.items.value[1].links.some(
        (link: any) => link.kind === 'party' && link.id === 'p1',
      ),
    ).toBe(false);
  });

  it('does nothing for unsupported source and target combinations', async () => {
    const relations = useEntityLinkRelations();
    await expect(
      relations.setLinkedIds('party', 'p1', 'encounter', ['e1']),
    ).resolves.toBeUndefined();
    await expect(
      relations.setLinkedIds('party', 'p1', 'pawn', ['mo1']),
    ).resolves.toBeUndefined();
  });
});
