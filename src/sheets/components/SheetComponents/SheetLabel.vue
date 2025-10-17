<template>
  <div class="sheet-label">
    <div v-if="showLabel && label" class="label-text q-mb-sm">{{ label }}</div>
    <div :class="['content-text', textClass]">{{ value }}</div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  label?: string;
  value?: string;
  showLabel?: boolean;
  textClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
  value: '',
  showLabel: true,
  textClass: '',
});
</script>

<style scoped>
.sheet-label {
  width: 100%;
}

.label-text {
  font-weight: bold;
  color: #555;
  font-size: 0.85em;
}

.content-text {
  padding: 8px 0;
  min-height: 32px;
  word-break: break-word;
}
</style>
