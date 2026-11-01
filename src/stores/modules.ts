import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Module } from '@/types';
import { useStore } from '@/utils/storage';
import moduleSchema from '@/schemas/module.schema.json';

export const useModuleStore = defineStore('modules', () => {
  const base = useStore<Module>({
    storeName: 'modules',
    validationSchema: moduleSchema,
  });

  const searchQuery = ref('');

  const filtered = computed(() => {
    let result = base.items.value;
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter((module) =>
        module.name.toLowerCase().includes(query),
      );
    }
    return result;
  });

  const sortedItems = base.sortedItems;

  const treeContains = (nodes: any[], noteId: string): boolean =>
    nodes.some(
      (node) =>
        node.noteId === noteId ||
        (node.children ? treeContains(node.children, noteId) : false),
    );

  const addNoteToTree = async (moduleId: string, noteId: string) => {
    const module = base.getById(moduleId);
    if (!module) return null;
    const tree = module.noteTree ?? [];
    if (treeContains(tree, noteId)) return module;
    return base.update(moduleId, {
      noteTree: [...tree, { noteId, children: [] }],
    });
  };

  const removeNoteFromTree = async (moduleId: string, noteId: string) => {
    const module = base.getById(moduleId);
    if (!module) return null;
    const prune = (nodes: any[]): any[] =>
      nodes
        .filter((node) => node.noteId !== noteId)
        .map((node) => ({
          ...node,
          children: node.children ? prune(node.children) : node.children,
        }));
    return base.update(moduleId, {
      noteTree: prune(module.noteTree ?? []),
    });
  };

  const getModuleName = (id: string | null) => {
    if (!id) return 'No Module';
    const module = base.items.value.find((m) => m.id === id);
    return module?.name || 'Unknown Module';
  };

  return {
    ...base,
    filtered,
    sortedItems,
    getModuleName,
    addNoteToTree,
    removeNoteFromTree,
    setFilter: (query: string) => {
      searchQuery.value = query;
    },
    clearFilter: () => {
      searchQuery.value = '';
    },
    setSearchQuery: (query: string) => {
      searchQuery.value = query;
    },
    searchQuery,
  };
});
