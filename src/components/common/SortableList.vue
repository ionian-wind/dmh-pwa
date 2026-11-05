<script setup lang="ts" generic="T extends Record<string, any>">
import { computed } from 'vue';
import { DnDOperations, useDroppable } from '@vue-dnd-kit/core';
import SortableItem from './SortableItem.vue';

const props = withDefaults(
  defineProps<{
    modelValue: T[];
    itemKey?: string;
    tag?: string;
    handle?: string;
    groups?: string[];
    disabled?: boolean;
  }>(),
  {
    itemKey: 'id',
    tag: 'div',
    groups: () => ['sortable-list'],
    disabled: false,
  },
);

const emit = defineEmits<{
  (e: 'update:modelValue', value: T[]): void;
  (e: 'end', value: { oldIndex: number; newIndex: number }): void;
}>();

const { elementRef, isOvered } = useDroppable({
  groups: props.groups,
  disabled: props.disabled,
  data: computed(() => ({ source: props.modelValue })),
  events: {
    onDrop: (store) => {
      const dragged = [...store.draggingElements.value.values()][0];
      const oldIndex = dragged?.data?.index ?? -1;
      const item = dragged?.data?.item as T | undefined;
      DnDOperations.applyTransfer(store);
      const next = [...props.modelValue];
      const newIndex =
        item && props.itemKey
          ? next.findIndex(
              (entry) => entry[props.itemKey] === item[props.itemKey],
            )
          : oldIndex;

      // Pointer down/up without an actual positional change must not be
      // treated as a sort. Besides avoiding redundant writes, this prevents a
      // no-move click on a drag handle from resorting playback queues.
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      emit('update:modelValue', next);
      emit('end', { oldIndex, newIndex });
    },
  },
});
</script>

<template>
  <component
    :is="tag"
    ref="elementRef"
    class="sortable-list"
    :class="{ 'sortable-list--over': isOvered }"
  >
    <SortableItem
      v-for="(item, index) in modelValue"
      :key="item[itemKey]"
      :item="item"
      :index="index"
      :source="modelValue"
      :item-key="itemKey"
      :groups="groups"
      :handle="handle"
      :disabled="disabled"
    >
      <slot name="item" :element="item" :index="index" />
    </SortableItem>
  </component>
</template>

<style scoped>
.sortable-list {
  width: 100%;
}
</style>
