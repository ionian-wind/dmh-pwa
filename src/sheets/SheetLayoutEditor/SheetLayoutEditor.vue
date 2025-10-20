<script setup lang="ts">
import { ref, computed } from 'vue';
import type {
  SheetDefinition,
  SheetRow as SheetRowType,
  SheetCell,
  SheetComponent,
} from '@/types';
import { QBtn, QDrawer, QScrollArea } from 'quasar';
import {
  IconX,
  IconArrowsMinimize,
  IconArrowsMaximize,
} from '@tabler/icons-vue';
import { nanoid } from 'nanoid';
import SheetRow from './SheetRow.vue';

interface Props {
  modelValue: SheetDefinition;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  'update:modelValue': [value: SheetDefinition];
}>();

const selectedCell = ref<SheetCell | null>(null);
const rightDrawerOpen = ref(false);
const hoverRowIndex = ref<number | null>(null);

const localSheet = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

function addRow() {
  const newRow: SheetRowType = {
    id: nanoid(),
    columns: 12, // Start with full width
    cells: [
      {
        id: nanoid(),
        span: 12, // Full width initially
        component: undefined,
      },
    ],
  };

  localSheet.value = {
    ...localSheet.value,
    layout: [...localSheet.value.layout, newRow],
  };
}

function removeRow(rowIndex: number) {
  const newLayout = [...localSheet.value.layout];
  newLayout.splice(rowIndex, 1);

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function insertRow(index: number) {
  const newRow: SheetRowType = {
    id: nanoid(),
    columns: 12, // Start with full width
    cells: [
      {
        id: nanoid(),
        span: 12, // Full width initially
        component: undefined,
      },
    ],
  };

  const newLayout = [...localSheet.value.layout];
  newLayout.splice(index, 0, newRow);

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function mergeCells(rowIndex: number, cellIndex: number) {
  const row = localSheet.value.layout[rowIndex];
  if (cellIndex >= row.cells.length - 1) return; // Can't merge last cell with next

  const currentCell = row.cells[cellIndex];
  const nextCell = row.cells[cellIndex + 1];

  let componentToKeep = currentCell.component;

  // If both cells have components, keep the component from the first cell
  if (!currentCell.component && nextCell.component) {
    componentToKeep = nextCell.component;
  }

  // Merge the spans and keep the selected component
  const mergedCell: SheetCell = {
    id: currentCell.id,
    span: currentCell.span + nextCell.span,
    component: componentToKeep,
  };

  // Create new layout with merged cell
  const newLayout = [...localSheet.value.layout];
  newLayout[rowIndex] = {
    ...row,
    cells: [
      ...row.cells.slice(0, cellIndex),
      mergedCell,
      ...row.cells.slice(cellIndex + 2),
    ],
  };

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function splitCell(rowIndex: number, cellIndex: number) {
  const row = localSheet.value.layout[rowIndex];
  const cell = row.cells[cellIndex];

  // Can't split if span is 1
  if (cell.span <= 1) return;

  // Calculate spans for the two new cells
  const firstSpan = Math.floor(cell.span / 2);
  const secondSpan = cell.span - firstSpan;

  // Create new cells
  const firstCell: SheetCell = {
    id: cell.id,
    span: firstSpan,
    component: cell.component, // Keep component in the first cell
  };

  const secondCell: SheetCell = {
    id: nanoid(),
    span: secondSpan,
    component: undefined, // Second cell is empty
  };

  // Create new layout with split cells
  const newLayout = [...localSheet.value.layout];
  newLayout[rowIndex] = {
    ...row,
    cells: [
      ...row.cells.slice(0, cellIndex),
      firstCell,
      secondCell,
      ...row.cells.slice(cellIndex + 1),
    ],
  };

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function removeCell(rowIndex: number, cellIndex: number) {
  const newLayout = [...localSheet.value.layout];
  const row = newLayout[rowIndex];

  // Remove the cell
  const removedCell = row.cells.splice(cellIndex, 1)[0];

  // Add the removed cell's span to the first cell in the row
  if (row.cells.length > 0) {
    row.cells[0].span += removedCell.span;
  }

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function editComponent(cell: SheetCell) {
  selectedCell.value = { ...cell };
  rightDrawerOpen.value = true;
}

function removeComponent(rowIndex: number, cellIndex: number) {
  const newLayout = [...localSheet.value.layout];
  const cell = newLayout[rowIndex].cells[cellIndex];

  // Remove component but keep the cell
  newLayout[rowIndex].cells[cellIndex] = {
    ...cell,
    component: undefined,
  };

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

function selectComponent(
  componentType: string,
  rowIndex: number,
  cellIndex: number,
) {
  const newComponent: SheetComponent = {
    id: nanoid(),
    type: componentType,
    props: {},
    label: `New ${componentType}`,
    value: undefined,
  };

  // Update the specific cell in the layout
  const newLayout = [...localSheet.value.layout];
  const row = { ...newLayout[rowIndex] };
  const cell = { ...row.cells[cellIndex], component: newComponent };
  const updatedCells = [...row.cells];
  updatedCells[cellIndex] = cell;
  const updatedRow = { ...row, cells: updatedCells };
  newLayout[rowIndex] = updatedRow;

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };
}

// Handle property changes for the selected component
function updateComponentProperty(property: string, value: any) {
  if (!selectedCell.value || !selectedCell.value.component) return;

  // Update the component property
  const updatedComponent = {
    ...selectedCell.value.component,
    [property]: value,
  };

  // Find the cell in the layout and update it
  const newLayout = localSheet.value.layout.map((row) => ({
    ...row,
    cells: row.cells.map((cell) =>
      cell.id === selectedCell.value?.id
        ? { ...cell, component: updatedComponent }
        : cell,
    ),
  }));

  localSheet.value = {
    ...localSheet.value,
    layout: newLayout,
  };

  // Update the selectedCell reference with the new component
  selectedCell.value = {
    ...selectedCell.value,
    component: updatedComponent,
  };
}
</script>

<template>
  <div class="sheet-layout-editor">
    <!-- Toolbar -->
    <div
      v-if="localSheet.layout.length === 0"
      class="editor-toolbar q-pa-md bg-grey-2 q-mb-md"
    >
      <QBtn color="primary" label="Add Row" @click="addRow" class="q-mr-sm" />
    </div>

    <div class="editor-container">
      <!-- Main editor area -->
      <QList class="sheet-rows" bordered separator>
        <SheetRow
          v-for="(row, rowIndex) in localSheet.layout"
          :key="row.id"
          :row="row"
          :row-index="rowIndex"
          :model-value="row"
          @update:model-value="
              (updatedRow) => {
                const newLayout = [...localSheet.value.layout];
                newLayout[rowIndex] = updatedRow;
                localSheet.value = {
                  ...localSheet.value,
                  layout: newLayout,
                };
              }
            "
          @remove-row="removeRow"
          @insert-row="insertRow"
          @edit-component="editComponent"
          @remove-component="removeComponent"
          @merge-cells="mergeCells"
          @split-cell="splitCell"
          @remove-cell="removeCell"
          @select-component="selectComponent"
        />
      </QList>

      <!-- Right drawer for component properties -->
      <QDrawer
        v-if="selectedCell && selectedCell.component"
        v-model="rightDrawerOpen"
        side="right"
        bordered
        :width="300"
        :breakpoint="500"
      >
        <QScrollArea class="fit">
          <div class="q-pa-md">
            <div class="q-mb-md">
              <div class="text-h6">Component Properties</div>
              <QBtn
                flat
                round
                dense
                icon="close"
                class="absolute-top-right q-ma-md"
                @click="rightDrawerOpen = false"
              />
            </div>

            <div class="q-gutter-y-md">
              <QInput
                label="Label"
                :model-value="selectedCell.component.label"
                @update:model-value="updateComponentProperty('label', $event)"
                outlined
              />

              <QInput
                label="Type"
                :model-value="selectedCell.component.type"
                @update:model-value="updateComponentProperty('type', $event)"
                outlined
                readonly
              />

              <QInput
                label="Default Value"
                :model-value="selectedCell.component.value"
                @update:model-value="updateComponentProperty('value', $event)"
                outlined
              />

              <QInput
                label="Placeholder"
                :model-value="selectedCell.component.props.placeholder"
                @update:model-value="
                  updateComponentProperty('props', {
                    ...selectedCell.component.props,
                    placeholder: $event,
                  })
                "
                outlined
              />

              <QInput
                label="Field Name"
                :model-value="selectedCell.component.id"
                @update:model-value="updateComponentProperty('id', $event)"
                outlined
              />
            </div>
          </div>
        </QScrollArea>
      </QDrawer>
    </div>
  </div>
</template>
