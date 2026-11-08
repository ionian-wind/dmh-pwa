import { toValue } from 'vue';
import { featureLinkKinds } from 'virtual:feature-links';
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

export const NOTE_LINK_KINDS = [
  'party',
  'pawn',
  'encounter',
  'character',
] as const;

function noteLinkIds(note: any, kind: EntityLinkKind) {
  return ((note?.links ?? []) as MapEntityRef[])
    .filter((link) => link.kind === kind)
    .map((link) => link.id);
}

export function useEntityLinkRelations() {
  const stores = Object.fromEntries(
    featureLinkKinds.map((option) => [
      option.kind,
      option.useStore() as unknown as AnyStore,
    ]),
  ) as Record<EntityLinkKind, AnyStore>;

  async function loadFor(
    sourceKind: EntityLinkKind,
    targetKind: EntityLinkKind,
  ) {
    if (!stores[sourceKind] || !stores[targetKind]) return;
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
    if (!stores[sourceKind] || !stores[targetKind]) return [];
    const source = stores[sourceKind].getById(sourceId);

    if (sourceKind === 'playlist') {
      return ((source?.links ?? []) as MapEntityRef[])
        .filter((link) => link.kind === targetKind)
        .map((link) => link.id);
    }

    if (targetKind === 'playlist') {
      return items('playlist')
        .filter((playlist) =>
          ((playlist.links ?? []) as MapEntityRef[]).some(
            (link) => link.kind === sourceKind && link.id === sourceId,
          ),
        )
        .map((playlist) => playlist.id);
    }

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
      if (targetKind === 'location') {
        return items('location')
          .filter((location) => hasEntity(location.entities, 'note', sourceId))
          .map((location) => location.id);
      }
      return noteLinkIds(source, targetKind);
    }

    if (
      targetKind === 'note' &&
      (NOTE_LINK_KINDS as readonly string[]).includes(sourceKind)
    ) {
      return items('note')
        .filter((note) => noteLinkIds(note, sourceKind).includes(sourceId))
        .map((note) => note.id);
    }

    if (sourceKind === 'party') {
      if (targetKind === 'character') return [...(source?.characters ?? [])];
      if (targetKind === 'location') {
        return items('location')
          .filter((location) => hasEntity(location.entities, 'party', sourceId))
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'character') {
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

    if (sourceKind === 'pawn') {
      if (targetKind === 'encounter') {
        return items('encounter')
          .filter((encounter) => Number(encounter.pawns?.[sourceId]) > 0)
          .map((encounter) => encounter.id);
      }
      if (targetKind === 'location') {
        return items('location')
          .filter((location) => hasEntity(location.entities, 'pawn', sourceId))
          .map((location) => location.id);
      }
    }

    if (sourceKind === 'encounter') {
      if (targetKind === 'pawn') return Object.keys(source?.pawns ?? {});
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
    if (!stores[sourceKind] || !stores[targetKind]) return;
    const ids = targetIds.filter(
      (id) => !(targetKind === sourceKind && id === sourceId),
    );
    const source = stores[sourceKind].getById(sourceId);

    if (sourceKind === 'playlist') {
      const links = ((source?.links ?? []) as MapEntityRef[]).filter(
        (link) => link.kind !== targetKind,
      );
      await stores.playlist.update(sourceId, {
        links: [...links, ...ids.map((id) => ({ kind: targetKind, id }))],
      });
      return;
    }

    if (targetKind === 'playlist') {
      for (const playlist of items('playlist')) {
        const links = ((playlist.links ?? []) as MapEntityRef[]).filter(
          (link) => !(link.kind === sourceKind && link.id === sourceId),
        );
        if (ids.includes(playlist.id)) {
          links.push({ kind: sourceKind, id: sourceId });
        }
        await stores.playlist.update(playlist.id, { links });
      }
      return;
    }

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

    if (sourceKind === 'note' && targetKind === 'location') {
      await setLocationLinks('note', sourceId, ids);
      return;
    }

    if (sourceKind === 'note') {
      if (targetKind === 'note') return;
      const links = ((source?.links ?? []) as MapEntityRef[]).filter(
        (link) => link.kind !== targetKind,
      );
      await stores.note.update(sourceId, {
        links: [...links, ...ids.map((id) => ({ kind: targetKind, id }))],
      });
      return;
    }

    if (
      targetKind === 'note' &&
      (NOTE_LINK_KINDS as readonly string[]).includes(sourceKind)
    ) {
      for (const note of items('note')) {
        const links = ((note.links ?? []) as MapEntityRef[]).filter(
          (link) => !(link.kind === sourceKind && link.id === sourceId),
        );
        if (ids.includes(note.id)) {
          links.push({ kind: sourceKind, id: sourceId });
        }
        await stores.note.update(note.id, { links });
      }
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

    if (sourceKind === 'pawn' && targetKind === 'encounter') {
      for (const encounter of items('encounter')) {
        const linked = Number(encounter.pawns?.[sourceId]) > 0;
        const shouldLink = ids.includes(encounter.id);
        if (linked === shouldLink) continue;
        const pawns = { ...(encounter.pawns ?? {}) };
        if (shouldLink) pawns[sourceId] = 1;
        else delete pawns[sourceId];
        await stores.encounter.update(encounter.id, { pawns });
      }
      return;
    }
    if (sourceKind === 'pawn' && targetKind === 'location') {
      await setLocationLinks('pawn', sourceId, ids);
      return;
    }

    if (sourceKind === 'encounter' && targetKind === 'pawn') {
      const current = { ...(source?.pawns ?? {}) };
      const pawns: Record<string, number> = {};
      for (const [pawnId, count] of Object.entries(current)) {
        if (ids.includes(pawnId)) pawns[pawnId] = Number(count) || 1;
      }
      for (const pawnId of ids) {
        if (!(pawnId in pawns)) pawns[pawnId] = 1;
      }
      await stores.encounter.update(sourceId, { pawns });
      return;
    }
    if (sourceKind === 'encounter' && targetKind === 'location') {
      await setLocationLinks('encounter', sourceId, ids);
    }
  }

  return { loadFor, getLinkedIds, setLinkedIds, items };
}
