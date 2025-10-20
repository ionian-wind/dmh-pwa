<script setup lang="ts">
import { ref, computed } from 'vue';
import type { SheetRow, SheetCell, SheetComponent } from '@/types';
import { QBtn, QMenu, QList, QItem, QItemSection, QItemLabel, QDialog, QScrollArea } from 'quasar';
import { 
  IconDotsVertical, 
  IconRowInsertTop, 
  IconRowInsertBottom, 
  IconRowRemove,
  IconPlus,
  IconX,
  IconLayoutColumns,
  IconColumns1
} from '@tabler/icons-vue';
import { nanoid } from 'nanoid';
import SheetRenderer from '../SheetRenderer.vue';
import SheetColumn from './SheetColumn.vue';

interface Props {
  row: SheetRow;
  rowIndex: number;
  modelValue: SheetRow;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: SheetRow];
  removeRow: [index: number];
  insertRow: [index: number];
  selectComponent: [componentType: string, rowIndex: number, cellIndex: number];
  editComponent: [cell: SheetCell];
  removeComponent: [rowIndex: number, cellIndex: number];
  mergeCells: [rowIndex: number, cellIndex: number];
  splitCell: [rowIndex: number, cellIndex: number];
  removeCell: [rowIndex: number, cellIndex: number];
}>();

// Component types available for selection
const componentTypes = [
  { value: 'text', label: 'Text Field' },
  { value: 'number', label: 'Number Field' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'textarea', label: 'Text Area' },
];

// Remove the local selectComponent function as it's handled by emit to parent

function removeRow() {
  emit('removeRow', props.rowIndex);
}

function insertRowBefore() {
  emit('insertRow', props.rowIndex);
}

function insertRowAfter() {
  emit('insertRow', props.rowIndex + 1);
}
</script>

<template>
  <QItem>
    <!-- Row action menu that appears on hover -->
    <QItemSection side>
      <QBtn flat dense>
        <IconDotsVertical />
        <QMenu
          anchor="bottom right"
          self="top end"
        >
          <QList dense>
            <QItem v-close-popup
                   clickable
                   v-ripple
                   @click="insertRowBefore"
            >
              <QItemSection side>
                <IconRowInsertTop />
              </QItemSection>
              <QItemSection>Insert Row Before</QItemSection>
            </QItem>
            <QItem v-close-popup
                   clickable
                   v-ripple
                   @click="insertRowAfter"
            >
              <QItemSection side>
                <IconRowInsertBottom />
              </QItemSection>
              <QItemSection>Insert Row After</QItemSection>
            </QItem>
            <QItem v-close-popup
                   clickable
                   v-ripple
                   @click="removeRow"
            >
              <QItemSection side>
                <IconRowRemove />
              </QItemSection>
              <QItemSection>Remove Row</QItemSection>
            </QItem>
          </QList>
        </QMenu>
      </QBtn>
    </QItemSection>

    <QItemSection>
      <div class="row no-wrap" style="width: 100%;">
        <SheetColumn
          v-for="(cell, cellIndex) in row.cells"
          :key="cell.id"
          :cell="cell"
          :cell-index="cellIndex"
          :row-index="rowIndex"
          :row-cells-count="row.cells.length"
          :is-last-cell="cellIndex === row.cells.length - 1"
          :component-types="componentTypes"
          @select-component="(componentType, idx) => emit('selectComponent', componentType, props.rowIndex, idx)"
          @edit-component="(cell) => emit('editComponent', cell)"
          @remove-component="(rowIdx, cellIdx) => emit('removeComponent', rowIdx, cellIdx)"
          @merge-cells="(rowIdx, cellIdx) => emit('mergeCells', rowIdx, cellIdx)"
          @split-cell="(rowIdx, cellIdx) => emit('splitCell', rowIdx, cellIdx)"
          @remove-cell="(rowIdx, cellIdx) => emit('removeCell', rowIdx, cellIdx)"
        />
      </div>
    </QItemSection>
  </QItem>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: nowrap;
  width: 100%;
  gap: 0.5rem;
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
</style>
