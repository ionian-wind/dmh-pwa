import { useCharacterStore } from '@/stores/characters';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import { useMonsterStore } from '@/stores/monsters';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMapStore } from '@/maps/maps';
import { useMapLocationStore } from '@/maps/locations';
import { normalizeMapEntity } from '@/maps/utils/normalize';
import type { MapEntityKind, MapLocation } from '@/maps/types';
import type { JukeboxPlaylist } from '@/jukebox/types';

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
      const note = await useNoteStore().create({
        ...(data as any),
        hidden: false,
        contentType: (data as any).contentType ?? 'text',
      });
      return { id: note.id, label: note.title };
    }
    case 'module': {
      const module = await useModuleStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: module.id, label: module.name };
    }
    case 'party': {
      const party = await usePartyStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: party.id, label: party.name };
    }
    case 'monster': {
      const monster = await useMonsterStore().create(
        stripEntityMeta(payload as Record<string, unknown>) as any,
      );
      return { id: monster.id, label: monster.name };
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
    case 'map': {
      const form = stripEntityMeta(payload as Record<string, unknown>);
      const map = await useMapStore().create(normalizeMapEntity(form));
      return { id: map.id, label: map.title };
    }
    case 'location': {
      const location = payload as MapLocation;
      const created = await useMapLocationStore().create({
        name: location.name,
        description: location.description,
        entities: location.entities ?? [],
      });
      return { id: created.id, label: created.name };
    }
    case 'playlist': {
      const playlist = payload as JukeboxPlaylist;
      if (!playlist?.id) return null;
      return { id: playlist.id, label: playlist.name };
    }
  }
}
