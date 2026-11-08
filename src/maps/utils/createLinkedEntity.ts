import { useCharacterStore } from '@/stores/characters';
import { useEncounterStore } from '@/stores/encounters';
import { usePawnStore } from '@/stores/pawns';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMapLocationStore } from '@/maps/locations';
import type { MapEntityKind, MapLocation } from '@/maps/types';
import type { JukeboxPlaylist } from '@/jukebox/types';
import { noteDisplayTitle } from '@/utils/noteTitle';

export interface CreatedEntity {
  id: string;
  label: string;
}

export function stripEntityMeta<T extends Record<string, unknown>>(
  payload: T,
): T {
  const {
    id: _id,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = payload;
  return rest as T;
}

export async function createLinkedEntity(
  kind: MapEntityKind,
  payload: unknown,
): Promise<CreatedEntity | null> {
  switch (kind) {
    case 'note': {
      const data = stripEntityMeta(payload as Record<string, unknown>);
      const note = await useNoteStore().create(data as any);
      return { id: note.id, label: noteDisplayTitle(note) || note.id };
    }
    case 'party': {
      const party = await usePartyStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: party.id, label: party.name };
    }
    case 'pawn': {
      const pawn = await usePawnStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: pawn.id, label: pawn.name };
    }
    case 'encounter': {
      const encounter = await useEncounterStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: encounter.id, label: encounter.name };
    }
    case 'character': {
      const character = await useCharacterStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: character.id, label: character.name };
    }
    case 'location': {
      const location = payload as MapLocation;
      const created = await useMapLocationStore().create({
        name: location.name,
        description: location.description,
        entities: location.entities ?? [],
        map: location.map ?? {
          fileId: '',
          layers: [],
          markers: [],
          areas: [],
        },
      });
      return { id: created.id, label: created.name };
    }
    case 'playlist': {
      const playlist = payload as JukeboxPlaylist;
      if (!playlist?.id) return null;
      return { id: playlist.id, label: playlist.name };
    }
    default:
      return null;
  }
}
