import { toValue } from 'vue';
import { useNoteStore } from '@/stores/notes';
import { useModuleStore } from '@/stores/modules';
import { usePartyStore } from '@/stores/parties';
import { useCharacterStore } from '@/stores/characters';
import { useMonsterStore } from '@/stores/monsters';
import { useEncounterStore } from '@/stores/encounters';
import { useMapLocationStore } from '@/maps/locations';
import type { MapEntityRef } from '@/maps/types';
import type { EntityLinkKind } from './registry';

type AnyStore = {
  items: any;
  load: () => Promise<unknown>;
  getById: (id: string) => any;
  update: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
};

function hasEntity(
  entities: MapEntityRef[] | undefined,
  kind: EntityLinkKind,
  id: string,
) {
  return !!entities?.some((entity) => entity.kind === kind && entity.id === id);
}

function withoutEntity(
  entities: MapEntityRef[] | undefined,
  kind: EntityLinkKind,
  id: string,
) {
  return (entities ?? []).filter(
    (entity) => !(entity.kind === kind && entity.id === id),
  );
}

export function useEntityLinkRelations() {
  const stores: Record<EntityLinkKind, AnyStore> = {
    note: useNoteStore() as unknown as AnyStore,
    module: useModuleStore() as unknown as AnyStore,
    party: usePartyStore() as unknown as AnyStore,
    monster: useMonsterStore() as unknown as AnyStore,
    encounter: useEncounterStore() as unknown as AnyStore,
    character: useCharacterStore() as unknown as AnyStore,
    location: useMapLocationStore() as unknown as AnyStore,
  };

  async function loadFor(
    sourceKind: EntityLinkKind,
    targetKind: EntityLinkKind,
  ) {
    await Promise.all([stores[sourceKind].load(), stores[targetKind].load()]);
  }

  function items(kind: EntityLinkKind) {
    return toValue(stores[kind].items) as any[];
  }

  function getLinkedIds(
    sourceKind: EntityLinkKind,
    sourceId: string,
    targetKind: EntityLinkKind,
  ): string[] {
    const source = stores[sourceKind].getById(sourceId);

    if (sourceKind === 'location') {
      return ((source?.entities ?? []) as MapEntityRef[])
        .filter(
          (entity) =>
            entity.kind === targetKind &&
            !(targetKind === 'location' && entity.id === sourceId),
        )
        .map((entity) => entity.id);
    }

    if (sourceKind === 'note') {
      if (targetKind === 'module') return [...(source?.moduleIds ?? [])];
      if (targetKind === 'location') {
        return items('location')
          .filter((location) => hasEntity(location.entities, 'note', sourceId))
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'module') {
      if (targetKind === 'note') {
        return items('note')
          .filter((note) => note.moduleIds?.includes(sourceId))
          .map((note) => note.id);
      }
      if (targetKind === 'party') {
        return items('party')
          .filter((party) => party.moduleIds?.includes(sourceId))
          .map((party) => party.id);
      }
      if (targetKind === 'monster') {
        return items('monster')
          .filter((monster) => monster.moduleIds?.includes(sourceId))
          .map((monster) => monster.id);
      }
      if (targetKind === 'encounter') {
        return items('encounter')
          .filter((encounter) => encounter.moduleIds?.includes(sourceId))
          .map((encounter) => encounter.id);
      }
      if (targetKind === 'character') {
        return items('character')
          .filter((character) => character.moduleIds?.includes(sourceId))
          .map((character) => character.id);
      }
      if (targetKind === 'location') {
        return items('location')
          .filter((location) =>
            hasEntity(location.entities, 'module', sourceId),
          )
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'party') {
      if (targetKind === 'module') return [...(source?.moduleIds ?? [])];
      if (targetKind === 'character') return [...(source?.characters ?? [])];
      if (targetKind === 'location') {
        return items('location')
          .filter((location) => hasEntity(location.entities, 'party', sourceId))
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'character') {
      if (targetKind === 'module') return [...(source?.moduleIds ?? [])];
      if (targetKind === 'party') {
        return items('party')
          .filter((party) => party.characters?.includes(sourceId))
          .map((party) => party.id);
      }
      if (targetKind === 'location') {
        return items('location')
          .filter((location) =>
            hasEntity(location.entities, 'character', sourceId),
          )
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'monster') {
      if (targetKind === 'module') return [...(source?.moduleIds ?? [])];
      if (targetKind === 'encounter') {
        return items('encounter')
          .filter((encounter) => Number(encounter.monsters?.[sourceId]) > 0)
          .map((encounter) => encounter.id);
      }
      if (targetKind === 'location') {
        return items('location')
          .filter((location) =>
            hasEntity(location.entities, 'monster', sourceId),
          )
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'encounter') {
      if (targetKind === 'module') return [...(source?.moduleIds ?? [])];
      if (targetKind === 'monster') return Object.keys(source?.monsters ?? {});
      if (targetKind === 'location') {
        return items('location')
          .filter((location) =>
            hasEntity(location.entities, 'encounter', sourceId),
          )
          .map((location) => location.id);
      }
    }

    return [];
  }

  async function setLocationLinks(
    sourceKind: EntityLinkKind,
    sourceId: string,
    targetLocationIds: string[],
  ) {
    const selected = new Set(targetLocationIds);
    for (const location of items('location')) {
      const linked = hasEntity(location.entities, sourceKind, sourceId);
      const shouldLink = selected.has(location.id);
      if (linked === shouldLink) continue;

      const entities = shouldLink
        ? [...(location.entities ?? []), { kind: sourceKind, id: sourceId }]
        : withoutEntity(location.entities, sourceKind, sourceId);
      await stores.location.update(location.id, { entities });
    }
  }

  async function setLinkedIds(
    sourceKind: EntityLinkKind,
    sourceId: string,
    targetKind: EntityLinkKind,
    targetIds: string[],
  ): Promise<void> {
    const ids = targetIds.filter(
      (id) => !(targetKind === sourceKind && id === sourceId),
    );
    const source = stores[sourceKind].getById(sourceId);

    if (sourceKind === 'location') {
      const entities = [
        ...((source?.entities ?? []) as MapEntityRef[]).filter(
          (entity) => entity.kind !== targetKind,
        ),
        ...ids.map((id) => ({ kind: targetKind, id })),
      ];
      await stores.location.update(sourceId, { entities });
      return;
    }

    if (sourceKind === 'note' && targetKind === 'module') {
      await stores.note.update(sourceId, { moduleIds: ids });
      return;
    }
    if (sourceKind === 'note' && targetKind === 'location') {
      await setLocationLinks('note', sourceId, ids);
      return;
    }

    if (sourceKind === 'module' && targetKind === 'note') {
      for (const note of items('note')) {
        const linked = note.moduleIds?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(note.id);
        if (linked === shouldLink) continue;
        const moduleIds = shouldLink
          ? [...new Set([...(note.moduleIds ?? []), sourceId])]
          : (note.moduleIds ?? []).filter((id: string) => id !== sourceId);
        await stores.note.update(note.id, { moduleIds });
      }
      return;
    }
    if (sourceKind === 'module' && targetKind === 'party') {
      for (const party of items('party')) {
        const linked = party.moduleIds?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(party.id);
        if (linked === shouldLink) continue;
        const moduleIds = shouldLink
          ? [...new Set([...(party.moduleIds ?? []), sourceId])]
          : (party.moduleIds ?? []).filter((id: string) => id !== sourceId);
        await stores.party.update(party.id, { moduleIds });
      }
      return;
    }
    if (sourceKind === 'module' && targetKind === 'monster') {
      for (const monster of items('monster')) {
        const linked = monster.moduleIds?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(monster.id);
        if (linked === shouldLink) continue;
        const moduleIds = shouldLink
          ? [...new Set([...(monster.moduleIds ?? []), sourceId])]
          : (monster.moduleIds ?? []).filter((id: string) => id !== sourceId);
        await stores.monster.update(monster.id, { moduleIds });
      }
      return;
    }
    if (sourceKind === 'module' && targetKind === 'encounter') {
      for (const encounter of items('encounter')) {
        const linked = encounter.moduleIds?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(encounter.id);
        if (linked === shouldLink) continue;
        const moduleIds = shouldLink
          ? [...new Set([...(encounter.moduleIds ?? []), sourceId])]
          : (encounter.moduleIds ?? []).filter((id: string) => id !== sourceId);
        await stores.encounter.update(encounter.id, { moduleIds });
      }
      return;
    }
    if (sourceKind === 'module' && targetKind === 'character') {
      for (const character of items('character')) {
        const linked = character.moduleIds?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(character.id);
        if (linked === shouldLink) continue;
        const moduleIds = shouldLink
          ? [...new Set([...(character.moduleIds ?? []), sourceId])]
          : (character.moduleIds ?? []).filter((id: string) => id !== sourceId);
        await stores.character.update(character.id, { moduleIds });
      }
      return;
    }
    if (sourceKind === 'module' && targetKind === 'location') {
      await setLocationLinks('module', sourceId, ids);
      return;
    }

    if (sourceKind === 'party' && targetKind === 'module') {
      await stores.party.update(sourceId, { moduleIds: ids });
      return;
    }
    if (sourceKind === 'party' && targetKind === 'character') {
      await stores.party.update(sourceId, { characters: ids });
      return;
    }
    if (sourceKind === 'party' && targetKind === 'location') {
      await setLocationLinks('party', sourceId, ids);
      return;
    }

    if (sourceKind === 'character' && targetKind === 'module') {
      await stores.character.update(sourceId, { moduleIds: ids });
      return;
    }
    if (sourceKind === 'character' && targetKind === 'party') {
      for (const party of items('party')) {
        const linked = party.characters?.includes(sourceId) ?? false;
        const shouldLink = ids.includes(party.id);
        if (linked === shouldLink) continue;
        const characters = shouldLink
          ? [...new Set([...(party.characters ?? []), sourceId])]
          : (party.characters ?? []).filter((id: string) => id !== sourceId);
        await stores.party.update(party.id, { characters });
      }
      return;
    }
    if (sourceKind === 'character' && targetKind === 'location') {
      await setLocationLinks('character', sourceId, ids);
      return;
    }

    if (sourceKind === 'monster' && targetKind === 'module') {
      await stores.monster.update(sourceId, { moduleIds: ids });
      return;
    }
    if (sourceKind === 'monster' && targetKind === 'encounter') {
      for (const encounter of items('encounter')) {
        const linked = Number(encounter.monsters?.[sourceId]) > 0;
        const shouldLink = ids.includes(encounter.id);
        if (linked === shouldLink) continue;
        const monsters = { ...(encounter.monsters ?? {}) };
        if (shouldLink) monsters[sourceId] = 1;
        else delete monsters[sourceId];
        await stores.encounter.update(encounter.id, { monsters });
      }
      return;
    }
    if (sourceKind === 'monster' && targetKind === 'location') {
      await setLocationLinks('monster', sourceId, ids);
      return;
    }

    if (sourceKind === 'encounter' && targetKind === 'module') {
      await stores.encounter.update(sourceId, { moduleIds: ids });
      return;
    }
    if (sourceKind === 'encounter' && targetKind === 'monster') {
      const current = { ...(source?.monsters ?? {}) };
      const monsters: Record<string, number> = {};
      for (const [monsterId, count] of Object.entries(current)) {
        if (ids.includes(monsterId)) monsters[monsterId] = Number(count) || 1;
      }
      for (const monsterId of ids) {
        if (!(monsterId in monsters)) monsters[monsterId] = 1;
      }
      await stores.encounter.update(sourceId, { monsters });
      return;
    }
    if (sourceKind === 'encounter' && targetKind === 'location') {
      await setLocationLinks('encounter', sourceId, ids);
    }
  }

  return { loadFor, getLinkedIds, setLinkedIds, items };
}
