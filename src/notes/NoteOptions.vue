<script setup lang="ts">
import { computed } from 'vue';
import type { Note } from '@/types';
import TagSelector from '@/components/common/TagSelector.vue';
import NoteTypeSelector from '@/notes/NoteTypeSelector.vue';
import { mergeHashtags, removeHashtag } from '@/utils/tags';

const props = defineProps<{
  note: Note;
}>();

const emit = defineEmits<{
  (e: 'update:note', note: Note): void;
}>();

function patchNote(patch: Partial<Note>) {
  emit('update:note', { ...props.note, ...patch });
}

const typeId = computed({
  get: () => props.note.typeId ?? null,
  set: (value: string | null) => patchNote({ typeId: value }),
});

const editorTags = computed({
  get: () => mergeHashtags(props.note.tags ?? [], props.note.content),
  set: (tags: string[]) => {
    const removedTags = editorTags.value.filter((tag) => !tags.includes(tag));
    let content = props.note.content;
    for (const tag of removedTags) {
      content = removeHashtag(content, tag);
    }
    patchNote({ content, tags });
  },
});
</script>

<template>
  <div class="note-options q-gutter-md">
    <NoteTypeSelector :allow-create="true" v-model="typeId" />
    <TagSelector
      v-model="editorTags"
      :entity-type="'note'"
      :current-entity-id="note.id"
    />
  </div>
</template>
