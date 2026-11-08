import { describe, expect, it, vi } from 'vitest';
import mapLocations from '@/migrations/0000000005_map_locations';
import mapLocationOneToOne from '@/migrations/0000000006_map_location_one_to_one';
import noteContentType from '@/migrations/0000000008_note_content_type';
import removeNoteContentType from '@/migrations/0000000015_remove_note_content_type';
import stripEscapedAnchorSpaces from '@/migrations/0000000016_strip_escaped_block_anchor_spaces';
import removeEncounterNotes from '@/migrations/0000000017_remove_encounter_notes';
import renameEncounterPawns from '@/migrations/0000000018_rename_encounter_field_to_pawns';
import renamePawnStore from '@/migrations/0000000019_rename_pawn_store';

function transactionWith(storeData: Record<string, any[]>) {
  const stores = new Map<string, any>();
  for (const [name, rows] of Object.entries(storeData)) {
    stores.set(name, {
      getAll: vi.fn().mockResolvedValue(rows),
      put: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    });
  }
  return {
    stores,
    transaction: {
      objectStore: (name: string) => stores.get(name),
    } as any,
  };
}

describe('map location migrations', () => {
  it('extracts embedded locations, deduplicates and repairs ids', async () => {
    const { stores, transaction } = transactionWith({
      maps: [
        {
          id: 'm1',
          title: 'World',
          locations: [
            { id: 'l1', name: 'Town', entities: [] },
            { id: 'l1', name: 'Duplicate' },
            { name: 'No id' },
          ],
          locationIds: ['l1'],
        },
        {
          id: 'm2',
          title: 'Empty',
        },
      ],
      map_locations: [],
    });

    await mapLocations.go(transaction);

    const mapPuts = stores
      .get('maps')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(mapPuts[0].locationIds).toEqual(['l1']);
    expect(mapPuts[0].locations).toBeUndefined();
    expect(mapPuts[1].locationIds).toEqual([]);

    const locationPuts = stores
      .get('map_locations')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(locationPuts).toHaveLength(1);
    expect(locationPuts[0]).toMatchObject({
      id: 'l1',
      name: 'Town',
      description: '',
      entities: [],
    });
    expect(locationPuts[0].createdAt).toEqual(expect.any(Number));
  });

  it('normalizes missing location fields', async () => {
    const { stores, transaction } = transactionWith({
      maps: [
        {
          id: 'm1',
          locations: [
            {
              id: 'l1',
              name: '',
              description: undefined,
              entities: 'bad',
              createdAt: 0,
              updatedAt: 0,
            },
          ],
        },
      ],
      map_locations: [],
    });

    await mapLocations.go(transaction);

    expect(stores.get('map_locations').put.mock.calls[0][0]).toMatchObject({
      name: '',
      description: '',
      entities: [],
    });
  });

  it('keeps one map per location and prefers explicit ids', async () => {
    const { stores, transaction } = transactionWith({
      maps: [
        { id: 'm1', locationId: 'loc1', locationIds: ['legacy'] },
        { id: 'm2', locationIds: ['loc1'] },
        { id: 'm3', locationIds: ['loc2'] },
        { id: 'm4' },
      ],
    });

    await mapLocationOneToOne.go(transaction);

    const saved = stores
      .get('maps')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(saved.map((map: any) => map.locationId)).toEqual([
      'loc1',
      null,
      'loc2',
      null,
    ]);
    expect(saved.every((map: any) => map.locationIds === undefined)).toBe(true);
  });

  it('adds a text content type only to notes without one', async () => {
    const { stores, transaction } = transactionWith({
      notes: [
        { id: 'n1', contentType: 'text' },
        { id: 'n2', contentType: 'draw' },
        { id: 'n3' },
        { id: 'n4', contentType: 'unknown' },
      ],
    });

    await noteContentType.go(transaction);

    const saved = stores
      .get('notes')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(saved).toEqual([
      { id: 'n3', contentType: 'text' },
      { id: 'n4', contentType: 'text' },
    ]);
  });

  it('moves legacy drawing notes into the drawings store', async () => {
    const now = 42;
    const { stores, transaction } = transactionWith({
      notes: [
        {
          id: 'n1',
          title: 'Text',
          content: '# Hi',
          contentType: 'text',
          preview: 'stale',
          createdAt: now,
          updatedAt: now,
        },
        {
          id: 'n2',
          title: 'Sketch',
          content: '{"shape":1}',
          contentType: 'draw',
          preview: 'data:image/png;base64,abc',
          createdAt: now,
          updatedAt: now,
        },
      ],
      drawings: [],
    });

    await removeNoteContentType.go(transaction);

    const savedNotes = stores
      .get('notes')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(savedNotes).toHaveLength(2);

    const text = savedNotes.find((note: any) => note.id === 'n1');
    expect(text.contentType).toBeUndefined();
    expect(text.preview).toBeUndefined();
    expect(text.content).toBe('# Hi');

    const drawn = savedNotes.find((note: any) => note.id === 'n2');
    expect(drawn.contentType).toBeUndefined();
    expect(drawn.preview).toBeUndefined();

    const savedDrawings = stores
      .get('drawings')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(savedDrawings).toEqual([
      expect.objectContaining({
        snapshot: '{"shape":1}',
        preview: 'data:image/png;base64,abc',
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    expect(drawn.content).toBe(`![drawing](drawing://${savedDrawings[0].id})`);
  });

  it('strips escaped spaces before block anchors', async () => {
    const { stores, transaction } = transactionWith({
      notes: [
        {
          id: 'n1',
          content:
            'First \\ <!-- dmh:block=note-block-one -->\n\nSecond <!-- dmh:block=note-block-two -->',
        },
        { id: 'n2', content: 'No anchors' },
      ],
    });

    await stripEscapedAnchorSpaces.go(transaction);

    const saved = stores
      .get('notes')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(saved).toEqual([
      {
        id: 'n1',
        content:
          'First <!-- dmh:block=note-block-one -->\n\nSecond <!-- dmh:block=note-block-two -->',
      },
    ]);
  });

  it('removes the encounter notes field', async () => {
    const { stores, transaction } = transactionWith({
      encounters: [
        { id: 'e1', name: 'Ambush', pawns: { m1: 2 }, notes: 'Legacy' },
        { id: 'e2', name: 'Patrol', pawns: {} },
      ],
    });

    await removeEncounterNotes.go(transaction);

    const saved = stores
      .get('encounters')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(saved).toEqual([{ id: 'e1', name: 'Ambush', pawns: { m1: 2 } }]);
  });

  it('renames the legacy encounter field to pawns', async () => {
    const { stores, transaction } = transactionWith({
      encounters: [
        {
          id: 'e1',
          name: 'Ambush',
          monsters: { m1: 2 },
          createdAt: 1,
          updatedAt: 1,
        },
        { id: 'e2', name: 'Patrol', pawns: { m2: 1 } },
        {
          id: 'e3',
          name: 'Mixed',
          monsters: { m1: 1 },
          pawns: { m2: 2 },
        },
      ],
    });

    await renameEncounterPawns.go(transaction);

    const saved = stores
      .get('encounters')
      .put.mock.calls.map((call: any[]) => call[0]);
    expect(saved).toEqual([
      {
        id: 'e1',
        name: 'Ambush',
        pawns: { m1: 2 },
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'e3',
        name: 'Mixed',
        pawns: { m2: 2 },
      },
    ]);
  });

  it('moves monsters, combatants and references into pawns', async () => {
    const { stores, transaction } = transactionWith({
      monsters: [{ id: 'm1', name: 'Goblin' }],
      pawns: [],
      combats: [
        {
          id: 'c1',
          combatants: [
            { id: 'p1', type: 'player' },
            { id: 'm1', type: 'monster' },
          ],
        },
      ],
      notes: [
        {
          id: 'n1',
          content: '[Goblin](monster://m1) and [Party](party://p1)',
          links: [
            { kind: 'monster', id: 'm1' },
            { kind: 'party', id: 'p1' },
          ],
        },
      ],
      map_locations: [
        {
          id: 'l1',
          entities: [{ kind: 'monster', id: 'm1' }],
          map: {
            markers: [{ id: 'mk1', entities: [{ kind: 'monster', id: 'm1' }] }],
            areas: [{ id: 'ar1', entities: [{ kind: 'monster', id: 'm1' }] }],
          },
        },
      ],
      indexations_mentions: [
        { id: 'note:n1', links: [{ kind: 'monster', id: 'm1' }] },
      ],
    });

    await renamePawnStore.go(transaction);

    expect(stores.get('monsters').clear).toHaveBeenCalled();
    expect(stores.get('pawns').put.mock.calls[0][0]).toEqual({
      id: 'm1',
      name: 'Goblin',
    });
    expect(stores.get('combats').put.mock.calls[0][0].combatants).toEqual([
      { id: 'p1', type: 'player' },
      { id: 'm1', type: 'pawn' },
    ]);
    expect(stores.get('notes').put.mock.calls[0][0]).toMatchObject({
      content: '[Goblin](pawn://m1) and [Party](party://p1)',
      links: [
        { kind: 'pawn', id: 'm1' },
        { kind: 'party', id: 'p1' },
      ],
    });
    expect(stores.get('map_locations').put.mock.calls[0][0]).toMatchObject({
      entities: [{ kind: 'pawn', id: 'm1' }],
      map: {
        markers: [{ entities: [{ kind: 'pawn', id: 'm1' }] }],
        areas: [{ entities: [{ kind: 'pawn', id: 'm1' }] }],
      },
    });
    expect(
      stores.get('indexations_mentions').put.mock.calls[0][0].links,
    ).toEqual([{ kind: 'pawn', id: 'm1' }]);
  });
});
