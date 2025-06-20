import { defineStore } from 'pinia';
import { ref } from 'vue';
import { idbPutItem, idbDeleteItem, idbGetAllItems } from '@/utils/storage';

export interface EntityRef {
  kind: string;
  id: string;
}

export interface Link {
  kind: string;
  id: string;
}

function makeKey(ref: EntityRef) {
  return `${ref.kind}:${ref.id}`;
}

export function createIndexationStore(storeName: string) {
  const store = `indexations_${storeName}`;
  return defineStore(storeName, () => {
    const links = ref<Record<string, Link[]>>({});
    const loaded = ref(false);

    async function load() {
      const all = await idbGetAllItems<{ id: string; links: Link[] }>(store);
      links.value = {};
      for (const rec of all) {
        links.value[rec.id] = rec.links;
      }
      loaded.value = true;
    }

    async function saveKey(key: string) {
      if (links.value[key] && links.value[key].length > 0) {
        await idbPutItem(store, { id: key, links: links.value[key] });
      } else {
        await idbDeleteItem(store, key);
      }
    }

    function addLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (!links.value[key]) links.value[key] = [];
      if (!links.value[key].some(link => link.kind === to.kind && link.id === to.id)) {
        links.value[key].push({ kind: to.kind, id: to.id });
        saveKey(key);
      }
    }

    function removeLink(from: EntityRef, to: EntityRef) {
      const key = makeKey(from);
      if (links.value[key]) {
        links.value[key] = links.value[key].filter(link => !(link.kind === to.kind && link.id === to.id));
        if (links.value[key].length === 0) delete links.value[key];
        saveKey(key);
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
      saveKey(key);
    }

    function clearLinks(from: EntityRef) {
      const key = makeKey(from);
      delete links.value[key];
      saveKey(key);
    }

    async function clearAll() {
      links.value = {};
      // Remove all records from the object store
      const all = await idbGetAllItems<{ id: string }>(store);
      await Promise.all(all.map(rec => idbDeleteItem(store, rec.id)));
    }

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
      loaded,
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
