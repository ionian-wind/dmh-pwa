<script setup lang="ts">
import { computed, onMounted } from 'vue';
import Button from './Button.vue';
import { useBookmarkStore } from '@/stores/bookmarks';

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
    <i class="si si-bookmark"></i>
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