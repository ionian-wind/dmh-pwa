<template>
  <i
    v-if="isRpgIcon"
    :class="['ra', markerIconClass(props.icon)]"
    :style="{ fontSize: `${props.size}px` }"
    aria-hidden="true"
  ></i>
  <span v-else :style="{ fontSize: `${props.size}px` }" aria-hidden="true">
    {{ props.icon || '🎵' }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { markerIconClass } from '@/maps/icons';

const props = withDefaults(
  defineProps<{
    icon?: string;
    size?: number;
  }>(),
  { icon: '', size: 20 },
);

const isRpgIcon = computed(
  () => props.icon.startsWith('ra-') || props.icon.includes(':ra-'),
);
</script>
