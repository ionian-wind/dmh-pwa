import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Note } from '@/types';
import { useStore } from '@/utils/storage';
import noteSchema from "@/schemas/note.schema.json";
import { extractMentionedEntities } from '@/utils/markdownParser';
import { useMentionsStore } from '@/utils/storage';

export const useNoteStore = defineStore('notes', () => {
  const base = useStore<Note>({ storeName: 'notes', validationSchema: noteSchema });
  const searchQuery = ref('');
  const tagFilter = ref<string | null>(null);
  const indexation = useMentionsStore();
  
  async function create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
    const newNote = await base.create(note);
    // Indexation
    const from = { kind: 'note', id: newNote.id };
    const mentioned = extractMentionedEntities(newNote.content);
    await indexation.setLinks(from, mentioned);
    return newNote;
  }

  async function update(id: string, patch: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>) {
    const updated = await base.update(id, patch);
    // Indexation
    const from = { kind: 'note', id };
    const mentioned = extractMentionedEntities(updated.content || '');
    await indexation.setLinks(from, mentioned);
    return updated;
  }

  async function remove(id: string) {
    await base.remove(id);
    // Indexation
    const from = { kind: 'note', id };
    await indexation.clearLinks(from);
  }

  const filtered = computed(() => {
    let result = base.items.value;
    
    // Tag filter
    if (tagFilter.value) {
      result = result.filter(note => note.tags.includes(tagFilter.value!));
    }
    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    return result;
  });

  const allTags = computed(() => {
    const tags = new Set<string>();
    base.items.value.forEach(note =>
      note.tags.forEach(tag => tags.add(tag))
    );
    return Array.from(tags);
  });

  return {
    ...base,
    filtered,
    getById: base.getById,
    create,
    update,
    remove,
    setFilter: (query: string) => { searchQuery.value = query; },
    clearFilter: () => { searchQuery.value = ''; },
    setSearchQuery: (query: string) => { searchQuery.value = query; },
    setTagFilter: (tag: string | null) => { tagFilter.value = tag; },
    clearTagFilter: () => { tagFilter.value = null; },
    allTags,
    searchQuery,
    tagFilter,
  };
});
