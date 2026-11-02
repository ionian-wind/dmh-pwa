import { useCharacterStore } from '@/stores/characters';
import { useEncounterStore } from '@/stores/encounters';
import { useModuleStore } from '@/stores/modules';
import { useMonsterStore } from '@/stores/monsters';
import { useNoteStore } from '@/stores/notes';
import { usePartyStore } from '@/stores/parties';
import { useMapStore } from '../maps';
import type { MapEntityKind, MapEntityRef } from '../types';

export type EntityTitleField = 'title' | 'name';

export interface MapEntityKindOption {
  kind: MapEntityKind;
  labelKey: string;
  titleField: EntityTitleField;
  useStore: () => {
    items: any[];
    isLoaded?: boolean;
    load: () => Promise<unknown>;
    getById?: (id: string) => any;
  };
}

export const MAP_ENTITY_KIND_OPTIONS: MapEntityKindOption[] = [
  {
    kind: 'note',
    labelKey: 'notes.title',
    titleField: 'title',
    useStore: useNoteStore,
  },
  {
    kind: 'module',
    labelKey: 'modules.title',
    titleField: 'name',
    useStore: useModuleStore,
  },
  {
    kind: 'party',
    labelKey: 'parties.title',
    titleField: 'name',
    useStore: usePartyStore,
  },
  {
    kind: 'monster',
    labelKey: 'monsters.title',
    titleField: 'name',
    useStore: useMonsterStore,
  },
  {
    kind: 'encounter',
    labelKey: 'encounters.title',
    titleField: 'name',
    useStore: useEncounterStore,
  },
  {
    kind: 'character',
    labelKey: 'characters.title',
    titleField: 'name',
    useStore: useCharacterStore,
  },
  {
    kind: 'map',
    labelKey: 'maps.title',
    titleField: 'title',
    useStore: useMapStore,
  },
];

export function getEntityKindOption(
  kind: string,
): MapEntityKindOption | undefined {
  return MAP_ENTITY_KIND_OPTIONS.find((option) => option.kind === kind);
}

export function entityRefKey(ref: MapEntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function dedupeEntityRefs(refs: MapEntityRef[]): MapEntityRef[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = entityRefKey(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
