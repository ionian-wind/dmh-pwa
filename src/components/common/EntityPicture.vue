<script setup lang="ts">
import { computed } from 'vue';
import { IconPhoto } from '@tabler/icons-vue';
import { useStoredFileUrl } from '@/composables/useStoredFileUrl';

const props = withDefaults(
  defineProps<{
    picture?: string | null;
    size?: string;
    alt?: string;
    rounded?: boolean;
  }>(),
  { picture: null, size: '100%', alt: '', rounded: true },
);

const url = useStoredFileUrl(() => props.picture);
const style = computed(() => ({
  width: props.size,
  height: props.size,
}));
</script>

<template>
  <div
    class="entity-picture"
    :class="{ 'entity-picture--rounded': rounded }"
    :style="style"
  >
    <img v-if="url" :src="url" :alt="alt" />
    <div v-else class="entity-picture-placeholder">
      <IconPhoto :size="24" />
    </div>
  </div>
</template>

<style scoped>
.entity-picture {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  overflow: hidden;
  background: var(--color-background-soft);
  color: var(--color-text-lighter);
}

.entity-picture--rounded {
  border-radius: var(--border-radius-sm);
}

.entity-picture img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
