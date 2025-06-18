import { defineStore } from 'pinia';
import { useStorage } from '@/utils/storage';

export interface EntityRef {
  kind: string;
  id: string;
}

export interface Link {
  kind: string;
  id: string;
}

function makeKey(ref: EntityRef): string {
  return `${ref.kind}:${ref.id}`;
}

export function createIndexationStore(storeName: string) {
  return defineStore(storeName, () => {
    // Map from 'kind:id' to array of { kind, id }, persisted in localStorage
    const links = useStorage<Record<string, Link[]>>({
      key: `indexation-${storeName}`,
      defaultValue: {}
    });

    function addLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (!links.value[key]) {
        links.value[key] = [];
      }
      if (!links.value[key].some(link => link.kind === to.kind && link.id === to.id)) {
        links.value[key].push({ kind: to.kind, id: to.id });
      }
    }

    function removeLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (links.value[key]) {
        links.value[key] = links.value[key].filter(link => !(link.kind === to.kind && link.id === to.id));
        if (links.value[key].length === 0) {
          delete links.value[key];
        }
      }
    }

    function getLinks(from: EntityRef): Link[] {
      const key = makeKey(from);
      return links.value[key] || [];
    }

    function setLinks(from: EntityRef, toLinks: Link[]) {
      const key = makeKey(from);
      // Deduplicate by kind+id
      const seen = new Set<string>();
      const uniqueLinks = toLinks.filter(link => {
        const k = makeKey(link);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      links.value[key] = uniqueLinks;
    }

    function clearLinks(from: EntityRef) {
      const key = makeKey(from);
      delete links.value[key];
    }

    function clearAll() {
      links.value = {};
    }

    // Get all EntityRefs that link to the given entity (backlinks)
    function getBacklinks(target: EntityRef): EntityRef[] {
      const result: EntityRef[] = [];
      const targetKey = makeKey(target);
      for (const [fromKey, toLinks] of Object.entries(links.value)) {
        if (toLinks.some(link => makeKey(link) === targetKey)) {
          const [kind, id] = fromKey.split(':');
          result.push({ kind, id });
        }
      }
      return result;
    }


    return {
      links,
      addLink,
      removeLink,
      getLinks,
      setLinks,
      clearLinks,
      clearAll,
      getBacklinks,
    };
  });
}

// Global mentions store for all entity mentions
export const useMentionsStore = createIndexationStore('mentions'); 