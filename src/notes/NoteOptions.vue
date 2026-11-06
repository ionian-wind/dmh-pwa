<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { Note } from '@/types';
import TagSelector from '@/components/common/TagSelector.vue';
import NoteTypeSelector from '@/notes/NoteTypeSelector.vue';
import ColorPicker from '@/components/common/ColorPicker.vue';
import { mergeHashtags, removeHashtag } from '@/utils/tags';

const props = defineProps<{
  note: Note;
}>();

const emit = defineEmits<{
  (e: 'update:note', note: Note): void;
}>();

const { t } = useI18n();

function patchNote(patch: Partial<Note>) {
  emit('update:note', { ...props.note, ...patch });
}

const typeId = computed({
  get: () => props.note.typeId ?? null,
  set: (value: string | null) => patchNote({ typeId: value }),
});

const backgroundColor = computed({
  get: () => props.note.backgroundColor,
  set: (value: string) => patchNote({ backgroundColor: value }),
});

const editorTags = computed({
  get: () =>
    mergeHashtags(
      props.note.tags ?? [],
      props.note.contentType === 'draw' ? '' : props.note.content,
    ),
  set: (tags: string[]) => {
    const removedTags = editorTags.value.filter((tag) => !tags.includes(tag));
    let content = props.note.content;
    if (props.note.contentType !== 'draw') {
      for (const tag of removedTags) {
        content = removeHashtag(content, tag);
      }
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
    <ColorPicker
      id="note-background-color"
      v-model="backgroundColor"
      :label="t('editor.backgroundColor')"
      clearable
      :clear-label="t('common.clear')"
    />
  </div>
</template>
