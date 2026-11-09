<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: string;
  label?: string;
  id?: string;
  clearable?: boolean;
  clearLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const color = computed({
  get: () => props.modelValue ?? '',
  set: (value: string | null) => emit('update:modelValue', value ?? ''),
});
</script>

<template>
  <div class="color-picker">
    <label v-if="label" :for="id">{{ label }}</label>
    <div class="row items-center q-gutter-xs">
      <QBtn
        :id="id"
        flat
        class="color-picker-trigger"
        :style="{ backgroundColor: color }"
        :aria-label="label"
      >
        <QMenu>
          <QColor v-model="color" default-view="spectrum" format-model="hex" />
        </QMenu>
      </QBtn>
      <QBtn
        v-if="clearable && color"
        flat
        dense
        round
        size="sm"
        color="grey-7"
        :title="clearLabel"
        :aria-label="clearLabel"
        @click="color = ''"
      >
        <QIcon name="tabler-x" size="16px" />
      </QBtn>
    </div>
  </div>
</template>

<style scoped>
.color-picker {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-picker-trigger {
  width: 48px;
  min-height: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius-sm);
}
</style>
