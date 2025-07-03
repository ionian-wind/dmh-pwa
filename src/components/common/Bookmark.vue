<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Button from '../form/Button.vue';
import { useBookmarkStore } from '@/stores/bookmarks';
import { IconBookmark } from '@tabler/icons-vue';

const props = defineProps<{
  noteId: string;
  moduleId: string;
}>();

const bookmarkStore = useBookmarkStore();

const marked = computed(() =>
  bookmarkStore.isBookmarked(props.moduleId, props.noteId)
);

function handleClick() {
  if (marked.value) {
    bookmarkStore.removeBookmark(props.moduleId, props.noteId);
  } else {
    bookmarkStore.addBookmark(props.moduleId, props.noteId, '');
  }
}
onMounted(() => bookmarkStore.load());
</script>

<template>
  <Button
    variant="none"
    :class="{ marked }"
    @click="handleClick"
    title="Bookmark"
  >
    <IconBookmark />
  </Button>
</template>

<style scoped>
.marked {
  color: var(--color-success) !important;
}
.marked:hover {
  color: var(--color-success-dark) !important;
}
</style> 
