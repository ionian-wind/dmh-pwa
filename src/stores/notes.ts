import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Note } from '@/types';
import { useStore } from '@/utils/storage';
import noteSchema from '@/schemas/note.schema.json';
import { useMentionsStore } from '@/utils/storage';
import { debug } from '../utils/debug';
import { mergeHashtags } from '@/utils/tags';

export const useNoteStore = defineStore('notes', () => {
  const base = useStore<Note>({
    storeName: 'notes',
    validationSchema: noteSchema,
  });
  const searchQuery = ref('');
  const tagFilter = ref<string | null>(null);
  const indexation = useMentionsStore();

  async function create(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) {
    debug('noteStore.create called', note);
    const contentType = note.contentType ?? 'text';
    const newNote = await base.create({
      ...note,
      contentType,
      tags: mergeHashtags(
        note.tags ?? [],
        contentType === 'draw' ? '' : note.content,
      ),
    });
    // Indexation
    const from = { kind: 'note', id: newNote.id };
    const mentioned =
      newNote.contentType === 'draw'
        ? []
        : (await import('@/utils/markdownParser')).extractMentionedEntities(
            newNote.content,
          );
    await indexation.setLinks(from, mentioned);
    return newNote;
  }

  async function update(
    id: string,
    patch: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    const original = base.getById(id);
    const contentType = patch.contentType ?? original?.contentType ?? 'text';
    const content = patch.content ?? original?.content ?? '';
    let tags = patch.tags ?? original?.tags ?? [];
    if ('content' in patch && contentType !== 'draw') {
      tags = mergeHashtags(tags, content);
    }
    const updated = await base.update(id, { ...patch, tags });
    // Indexation
    const from = { kind: 'note', id };
    const mentioned =
      updated.contentType === 'draw'
        ? []
        : (await import('@/utils/markdownParser')).extractMentionedEntities(
            updated.content || '',
          );
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
      result = result.filter((note) => note.tags.includes(tagFilter.value!));
    }
    // Search filter
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase();
      result = result.filter(
        (note) =>
          note.title.toLowerCase().includes(query) ||
          (note.contentType !== 'draw' &&
            note.content.toLowerCase().includes(query)) ||
          note.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }
    return result;
  });

  const allTags = computed(() => {
    const tags = new Set<string>();
    base.items.value.forEach((note) =>
      note.tags.forEach((tag) => tags.add(tag)),
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
    setFilter: (query: string) => {
      searchQuery.value = query;
    },
    clearFilter: () => {
      searchQuery.value = '';
    },
    setSearchQuery: (query: string) => {
      searchQuery.value = query;
    },
    setTagFilter: (tag: string | null) => {
      tagFilter.value = tag;
    },
    clearTagFilter: () => {
      tagFilter.value = null;
    },
    allTags,
    searchQuery,
    tagFilter,
  };
});
