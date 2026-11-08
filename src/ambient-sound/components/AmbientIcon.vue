<template>
  <i
    v-if="iconClasses"
    :class="iconClasses"
    :style="{ fontSize: `${props.size}px` }"
    aria-hidden="true"
  ></i>
  <span v-else :style="{ fontSize: `${props.size}px` }" aria-hidden="true">
    {{ props.icon || '🎵' }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { markerIconClass } from '@/utils/maps/icons';

const props = withDefaults(
  defineProps<{
    icon?: string;
    size?: number;
  }>(),
  { icon: '', size: 20 },
);

/**
 * Icons stored in the icon-picker format (`collection:name`) are rendered as
 * classes. RPG Awesome keeps its historical `ra-*` support; Font Awesome
 * collections such as `fa-solid`, `fa-regular` and `fa-brands` map to
 * `fa-*` classes. Anything else falls back to text (legacy emoji icons).
 */
const iconClasses = computed<string[] | null>(() => {
  const raw = (props.icon ?? '').trim();
  if (!raw) return null;

  const separator = raw.indexOf(':');
  const collection = separator >= 0 ? raw.slice(0, separator) : '';
  const name = separator >= 0 ? raw.slice(separator + 1) : raw;

  if (collection.startsWith('fa-')) {
    return [collection, name.startsWith('fa-') ? name : `fa-${name}`];
  }
  if (collection === 'ra' || name.startsWith('ra-')) {
    return ['ra', markerIconClass(raw)];
  }
  return null;
});
</script>
