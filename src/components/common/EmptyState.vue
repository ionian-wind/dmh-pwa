<script setup lang="ts">
import type { Component } from 'vue';
import { IconInbox } from '@tabler/icons-vue';

withDefaults(
  defineProps<{
    icon?: Component;
    title: string;
    hint?: string;
  }>(),
  { icon: () => IconInbox, hint: '' },
);
</script>

<template>
  <div class="empty-state q-pa-xl flex flex-center column text-center">
    <component :is="icon" :size="64" class="text-grey-6" />
    <div class="text-subtitle1 q-mt-md">{{ title }}</div>
    <div v-if="hint" class="text-caption text-grey-7 q-mt-xs">
      {{ hint }}
    </div>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  width: 100%;
}
</style>
