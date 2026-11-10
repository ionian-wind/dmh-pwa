<script setup lang="ts" generic="T extends Record<string, any>">
import { computed, useTemplateRef } from 'vue';
import { makeSortableList } from '@vue-dnd-kit/core';
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

const listRef = useTemplateRef<HTMLElement>('list');
const model = computed({
  get: () => props.modelValue,
  set: (value: T[]) => emit('update:modelValue', value),
});
const group = computed(() => props.groups[0] ?? 'sortable-list');

const { items, isOver } = makeSortableList(listRef, {
  items: model,
  group: group.value,
  strategy: 'vertical',
  disabled: () => props.disabled,
  onDrop: (event) => {
    if (event.from.index === event.to.index && event.sameList) return;
    emit('end', {
      oldIndex: event.from.index,
      newIndex: event.to.index,
    });
  },
});
</script>

<template>
  <component
    :is="tag"
    ref="list"
    class="sortable-list"
    :class="{ 'sortable-list--over': isOver }"
  >
    <SortableItem
      v-for="(item, index) in items"
      :key="item[itemKey]"
      :item="item"
      :item-key="itemKey"
      :index="index"
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
