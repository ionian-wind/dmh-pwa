<script setup lang="ts">
defineProps<{
  title: string;
  titlePlaceholder: string;
  titleRequired?: boolean;
  validationError?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:title', value: string): void;
}>();
</script>

<template>
  <div class="entity-inline-editor q-pa-md q-gutter-md">
    <QInput
      :model-value="title"
      @update:model-value="(value) => emit('update:title', String(value ?? ''))"
      :placeholder="titlePlaceholder"
      :required="titleRequired !== false"
      borderless
      hide-bottom-space
      input-style="font-size: 1.5rem; font-weight: 500;"
      type="text"
    />
    <slot />

    <div
      v-if="validationError"
      class="text-negative bg-grey-1 q-pa-sm rounded-borders"
    >
      {{ validationError }}
    </div>
  </div>
</template>
