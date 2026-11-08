import type { Migration, MigrationTransaction } from '@/types/migration';

function renameKind<T extends { kind?: string }>(items: T[] | undefined): T[] {
  return (items ?? []).map((item) =>
    item.kind === 'monster' ? { ...item, kind: 'pawn' } : item,
  );
}

const migration: Migration = {
  version: 19,
  name: 'rename_monsters_to_pawns',
  affectedStores: [
    'monsters',
    'pawns',
    'combats',
    'notes',
    'map_locations',
    'indexations_mentions',
  ],
  async go(transaction: MigrationTransaction) {
    const monsterStore = transaction.objectStore('monsters');
    const pawnStore = transaction.objectStore('pawns');
    const monsters = await monsterStore.getAll();
    for (const monster of monsters) {
      await pawnStore.put(monster);
    }
    await monsterStore.clear();

    const combatStore = transaction.objectStore('combats');
    for (const combat of await combatStore.getAll()) {
      if (!Array.isArray(combat.combatants)) continue;
      let changed = false;
      const combatants = combat.combatants.map((combatant: any) => {
        if (combatant.type !== 'monster') return combatant;
        changed = true;
        return { ...combatant, type: 'pawn' };
      });
      if (changed) await combatStore.put({ ...combat, combatants });
    }

    const noteStore = transaction.objectStore('notes');
    for (const note of await noteStore.getAll()) {
      let changed = false;
      const links = Array.isArray(note.links)
        ? renameKind(note.links)
        : note.links;
      if (
        Array.isArray(note.links) &&
        links.some((link: any, index: number) => link !== note.links[index])
      ) {
        changed = true;
      }
      const content =
        typeof note.content === 'string'
          ? note.content.replace(/monster:\/\//g, 'pawn://')
          : note.content;
      if (content !== note.content) changed = true;
      if (changed) {
        await noteStore.put({
          ...note,
          ...(Array.isArray(note.links) ? { links } : {}),
          content,
        });
      }
    }

    const locationStore = transaction.objectStore('map_locations');
    for (const location of await locationStore.getAll()) {
      let changed = false;
      const entities = renameKind(location.entities);
      if (
        entities.some(
          (entity: any, index: number) => entity !== location.entities[index],
        )
      ) {
        changed = true;
      }
      const markers = (location.map?.markers ?? []).map((marker: any) => {
        const next = renameKind(marker.entities);
        if (
          next.some(
            (entity: any, index: number) => entity !== marker.entities[index],
          )
        ) {
          changed = true;
          return { ...marker, entities: next };
        }
        return marker;
      });
      const areas = (location.map?.areas ?? []).map((area: any) => {
        const next = renameKind(area.entities);
        if (
          next.some(
            (entity: any, index: number) => entity !== area.entities[index],
          )
        ) {
          changed = true;
          return { ...area, entities: next };
        }
        return area;
      });
      if (changed) {
        await locationStore.put({
          ...location,
          entities,
          map: { ...location.map, markers, areas },
        });
      }
    }

    const mentionStore = transaction.objectStore('indexations_mentions');
    for (const mention of await mentionStore.getAll()) {
      if (!Array.isArray(mention.links)) continue;
      const links = renameKind(mention.links);
      if (
        links.some((link: any, index: number) => link !== mention.links[index])
      ) {
        await mentionStore.put({ ...mention, links });
      }
    }
  },
};

export default migration;
