<script setup lang="ts">
import { computed } from 'vue';
import type { SheetDefinition, SheetRow, SheetCell } from '@/types';
import { QInput, QSelect, QField } from 'quasar';

interface Props {
  sheet: SheetDefinition;
  modelValue?: Record<string, any>;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({}),
});

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, any>];
}>();

const localValues = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function getComponentForCell(cell: SheetCell) {
  if (!cell.component) {
    return null;
  }

  const componentType = cell.component.type;
  const componentProps = {
    ...cell.component.props,
    label: cell.component.label,
    modelValue: localValues.value[cell.component.id] ?? cell.component.value,
    'onUpdate:modelValue': (val: any) => {
      localValues.value = {
        ...localValues.value,
        [cell.component!.id]: val
      };
    },
  };

  switch (componentType) {
    case 'text':
      return { component: QInput, props: { ...componentProps, type: 'text' } };
    case 'number':
      return { component: QInput, props: { ...componentProps, type: 'number' } };
    case 'select':
      return { component: QSelect, props: { ...componentProps } };
    case 'textarea':
      return { component: QInput, props: { ...componentProps, type: 'textarea', autogrow: true } };
    default:
      return { component: QField, props: { ...componentProps, readonly: true, value: 'Unsupported component type' } };
  }
}

function getCellClass(span: number) {
  return `col-${span}`;
}
</script>

<template>
  <div class="sheet-renderer">
    <div v-for="row in sheet.layout" :key="row.id">
      <div
        v-for="cell in row.cells"
        :key="cell.id"
        :class="getCellClass(cell.span)"
        class="col cell-container"
      >
        <component
          v-if="cell.component"
          :is="getComponentForCell(cell)?.component"
          v-bind="getComponentForCell(cell)?.props"
        />
        <div v-else class="empty-cell-placeholder">
          <!-- Empty cell with no component -->
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-renderer {
  width: 100%;
}

.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -0.5rem;
}

.cell-container {
  padding: 0.5rem;
  min-height: 2.5rem;
}

.col-1 { flex: 0 0 calc(100% * 1 / 12); }
.col-2 { flex: 0 0 calc(100% * 2 / 12); }
.col-3 { flex: 0 0 calc(100% * 3 / 12); }
.col-4 { flex: 0 0 calc(100% * 4 / 12); }
.col-5 { flex: 0 0 calc(100% * 5 / 12); }
.col-6 { flex: 0 0 calc(100% * 6 / 12); }
.col-7 { flex: 0 0 calc(100% * 7 / 12); }
.col-8 { flex: 0 0 calc(100% * 8 / 12); }
.col-9 { flex: 0 0 calc(100% * 9 / 12); }
.col-10 { flex: 0 0 calc(100% * 10 / 12); }
.col-11 { flex: 0 0 calc(100% * 11 / 12); }
.col-12 { flex: 0 0 calc(100% * 12 / 12); }

.empty-cell-placeholder {
  height: 100%;
  border: 1px dashed #ccc;
  border-radius: 4px;
}
</style>
