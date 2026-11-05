import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Note } from '@/types';
import { useStore } from '@/utils/storage';
import noteSchema from '@/schemas/note.schema.json';
import { extractMentionedEntities } from '@/utils/markdownParser';
import { useMentionsStore } from '@/utils/storage';
import { useModuleStore } from './modules';
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
        : extractMentionedEntities(newNote.content);
    await indexation.setLinks(from, mentioned);
    return newNote;
  }

  async function update(
    id: string,
    patch: Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>,
  ) {
    // Prevent 'hidden' from being changed after creation
    const original = base.getById(id);
    const patchWithoutHidden = { ...patch };
    if (original && 'hidden' in original) {
      patchWithoutHidden.hidden = original.hidden;
    }
    const contentType =
      patchWithoutHidden.contentType ?? original?.contentType ?? 'text';
    const content = patchWithoutHidden.content ?? original?.content ?? '';
    let tags = patchWithoutHidden.tags ?? original?.tags ?? [];
    if ('content' in patchWithoutHidden && contentType !== 'draw') {
      tags = mergeHashtags(tags, content);
    }
    const updated = await base.update(id, { ...patchWithoutHidden, tags });
    // Indexation
    const from = { kind: 'note', id };
    const mentioned =
      updated.contentType === 'draw'
        ? []
        : extractMentionedEntities(updated.content || '');
    await indexation.setLinks(from, mentioned);
    return updated;
  }

  async function remove(id: string) {
    await base.remove(id);
    // Indexation
    const from = { kind: 'note', id };
    await indexation.clearLinks(from);
  }

  /**
   * Explicitly convert a note between the normal note list and a module's
   * hidden document tree. `update()` intentionally protects `hidden`; this is
   * the dedicated conversion path.
   */
  async function setHidden(id: string, hidden: boolean) {
    const note = base.getById(id);
    if (!note) throw new Error(`Note '${id}' not found`);

    const moduleIds = note.moduleIds ?? [];
    if (hidden && moduleIds.length === 0) {
      throw new Error('A note must belong to a module before it can be hidden');
    }

    const modules = useModuleStore();
    if (hidden) {
      await Promise.all(
        moduleIds.map((moduleId) => modules.addNoteToTree(moduleId, id)),
      );
    } else {
      await Promise.all(
        moduleIds.map((moduleId) => modules.removeNoteFromTree(moduleId, id)),
      );
    }

    return base.update(id, { hidden } as Partial<Note>);
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
    setHidden,
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
