import { beforeEach, describe, expect, it, vi } from 'vitest';

const storeMocks = vi.hoisted(() => ({
  note: { create: vi.fn() },
  party: { create: vi.fn() },
  monster: { create: vi.fn() },
  encounter: { create: vi.fn() },
  character: { create: vi.fn() },
  location: { create: vi.fn() },
}));

vi.mock('@/stores/notes', () => ({ useNoteStore: () => storeMocks.note }));
vi.mock('@/stores/parties', () => ({ usePartyStore: () => storeMocks.party }));
vi.mock('@/stores/monsters', () => ({
  useMonsterStore: () => storeMocks.monster,
}));
vi.mock('@/stores/encounters', () => ({
  useEncounterStore: () => storeMocks.encounter,
}));
vi.mock('@/stores/characters', () => ({
  useCharacterStore: () => storeMocks.character,
}));
vi.mock('@/maps/locations', () => ({
  useMapLocationStore: () => storeMocks.location,
}));
import {
  createLinkedEntity,
  stripEntityMeta,
} from '@/maps/utils/createLinkedEntity';

const meta = { id: '', createdAt: 1, updatedAt: 2 };

describe('createLinkedEntity', () => {
  beforeEach(() => {
    for (const store of Object.values(storeMocks)) {
      store.create.mockReset();
    }
    storeMocks.note.create.mockResolvedValue({ id: 'note-1', title: 'Note' });
    storeMocks.party.create.mockResolvedValue({ id: 'party-1', name: 'Party' });
    storeMocks.monster.create.mockResolvedValue({
      id: 'monster-1',
      name: 'Monster',
    });
    storeMocks.encounter.create.mockResolvedValue({
      id: 'encounter-1',
      name: 'Encounter',
    });
    storeMocks.character.create.mockResolvedValue({
      id: 'character-1',
      name: 'Character',
    });
    storeMocks.location.create.mockResolvedValue({
      id: 'location-1',
      name: 'Location',
    });
  });

  it('strips entity metadata', () => {
    expect(stripEntityMeta({ ...meta, name: 'Keep' })).toEqual({
      name: 'Keep',
    });
  });

  it('creates a note with the visible defaults', async () => {
    await expect(
      createLinkedEntity('note', {
        ...meta,
        title: 'Note',
        content: 'Body',
      }),
    ).resolves.toEqual({ id: 'note-1', label: 'Note' });

    expect(storeMocks.note.create).toHaveBeenCalledWith({
      title: 'Note',
      content: 'Body',
    });
  });

  it.each([
    ['party', storeMocks.party, 'Party'],
    ['monster', storeMocks.monster, 'Monster'],
    ['encounter', storeMocks.encounter, 'Encounter'],
    ['character', storeMocks.character, 'Character'],
  ] as const)('creates a %s from editor data', async (kind, store, label) => {
    const created = await createLinkedEntity(kind, {
      ...meta,
      name: label,
    });

    expect(created).toEqual({ id: `${kind}-1`, label });
    expect(store.create).toHaveBeenCalledWith({ name: label });
  });

  it('creates a location with its link list', async () => {
    const created = await createLinkedEntity('location', {
      ...meta,
      name: 'Location',
      description: 'A place',
      entities: [{ kind: 'note', id: 'n1' }],
      map: {
        fileId: 'file-1',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [],
      },
    });

    expect(created).toEqual({ id: 'location-1', label: 'Location' });
    expect(storeMocks.location.create).toHaveBeenCalledWith({
      name: 'Location',
      description: 'A place',
      entities: [{ kind: 'note', id: 'n1' }],
      map: {
        fileId: 'file-1',
        layers: [{ id: 'base', title: 'Base' }],
        markers: [],
        areas: [],
      },
    });
  });

  it('uses the playlist saved by its editor', async () => {
    await expect(
      createLinkedEntity('playlist', { id: 'playlist-1', name: 'Mix' }),
    ).resolves.toEqual({ id: 'playlist-1', label: 'Mix' });

    await expect(
      createLinkedEntity('playlist', { name: 'Missing id' }),
    ).resolves.toBeNull();
  });
});
