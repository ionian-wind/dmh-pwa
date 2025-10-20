<script setup lang="ts">
import type { SheetCell } from '@/types';
import { QBtn, QMenu, QList, QItem } from 'quasar';
import {
  IconDotsVertical,
  IconX,
  IconLayoutColumns,
  IconColumns1,
  IconPlus,
} from '@tabler/icons-vue';
import SheetRenderer from '../SheetRenderer.vue';

interface ComponentType {
  value: string;
  label: string;
}

interface Props {
  cell: SheetCell;
  cellIndex: number;
  rowIndex: number;
  rowCellsCount?: number;
  isLastCell?: boolean;
  componentTypes: ComponentType[];
}

const props = defineProps<Props>();
const emit = defineEmits<{
  selectComponent: [componentType: string, cellIndex: number];
  editComponent: [cell: SheetCell];
  removeComponent: [rowIndex: number, cellIndex: number];
  mergeCells: [rowIndex: number, cellIndex: number];
  splitCell: [rowIndex: number, cellIndex: number];
  removeCell: [rowIndex: number, cellIndex: number];
}>();

const getCellClass = (span: number) => {
  return `col-${span}`;
};
</script>

<template>
  <div :class="getCellClass(cell.span)" class="relative-position">
    <!-- Cell content -->
    <SheetRenderer
      v-if="cell.component"
      :sheet="{
        id: 'temp',
        name: 'temp',
        layout: [{ id: 'temp-row', columns: 12, cells: [cell] }],
        createdAt: 0,
        updatedAt: 0,
      }"
      class="cell-content"
    />

    <!-- Empty cell with component selection menu -->
    <div
      v-else
      class="empty-cell"
    >
      <QBtn flat dense round size="sm" color="grey" @click.stop>
        <IconPlus size="14" />
        <QMenu anchor="center middle" self="center middle" class="q-pa-sm">
          <QList dense>
            <QItem
              v-for="compType in componentTypes"
              :key="compType.value"
              clickable
              v-ripple
              @click="emit('selectComponent', compType.value, props.cellIndex)"
            >
              <QItemSection>{{ compType.label }}</QItemSection>
            </QItem>
          </QList>
        </QMenu>
      </QBtn>
    </div>

    <!-- Cell actions overlay -->
    <div class="cell-actions absolute-top-right q-ma-sm">
      <QBtn flat dense round size="xs" color="grey">
        <IconDotsVertical size="14" />
        <QMenu anchor="bottom right" self="top end">
          <QList dense>
            <QItem
              v-if="cell.component"
              clickable
              v-ripple
              @click="emit('editComponent', cell)"
            >
              <QItemSection avatar>
                <IconX />
              </QItemSection>
              <QItemSection>Edit Component</QItemSection>
            </QItem>
            <QItem
              v-if="cell.component"
              clickable
              v-ripple
              @click="emit('removeComponent', rowIndex, cellIndex)"
            >
              <QItemSection avatar>
                <IconX />
              </QItemSection>
              <QItemSection>Remove Component</QItemSection>
            </QItem>
            <QItem
              v-if="cell.span > 1"
              clickable
              v-ripple
              @click="emit('splitCell', rowIndex, cellIndex)"
            >
              <QItemSection avatar>
                <IconLayoutColumns />
              </QItemSection>
              <QItemSection>Split Cell</QItemSection>
            </QItem>
            <QItem
              v-if="!isLastCell"
              clickable
              v-ripple
              @click="emit('mergeCells', rowIndex, cellIndex)"
            >
              <QItemSection avatar>
                <IconColumns1 />
              </QItemSection>
              <QItemSection>Merge with Next Cell</QItemSection>
            </QItem>
            <QItem
              v-if="rowCellsCount && rowCellsCount > 1"
              clickable
              v-ripple
              @click="emit('removeCell', rowIndex, cellIndex)"
            >
              <QItemSection avatar>
                <IconX />
              </QItemSection>
              <QItemSection>Remove Cell</QItemSection>
            </QItem>
          </QList>
        </QMenu>
      </QBtn>
    </div>
  </div>
</template>
