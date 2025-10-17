<template>
  <div class="component-palette">
    <b class="q-mb-md">Components</b>
    <QList class="q-mb-md">
      <QExpansionItem
        v-for="category in componentCategories"
        :key="category.name"
        :label="category.name"
        :caption="`${category.components.length} components`"
        expand-separator
        default-opened
      >
        <QCard>
          <QList>
            <QItem
              v-for="component in category.components"
              :key="component.type"
              draggable
              @dragstart="onDragStart($event, component)"
              class="draggable-component"
            >
              <QItemSection>
                <QItemLabel>{{ component.name }}</QItemLabel>
              </QItemSection>
            </QItem>
          </QList>
        </QCard>
      </QExpansionItem>
    </QList>
  </div>
</template>

<script setup lang="ts">
import type {
  ComponentCategory,
  ComponentDefinition,
} from '@/sheets/types/sheet.types';

const componentCategories: ComponentCategory[] = [
  {
    name: 'Input Fields',
    components: [
      {
        type: 'SheetTextInput',
        name: 'Text Input',
        icon: 'text_fields',
        defaultProps: {
          label: 'Text Field',
          value: '',
          placeholder: 'Enter text...',
        },
        displayComponent: 'SheetTextInput',
      },
      {
        type: 'SheetNumberInput',
        name: 'Number Input',
        icon: 'tag',
        defaultProps: {
          label: 'Number Field',
          value: 0,
          placeholder: 'Enter number...',
        },
        displayComponent: 'SheetNumberInput',
      },
      {
        type: 'SheetSelectInput',
        name: 'Select Input',
        icon: 'arrow_drop_down_circle',
        defaultProps: {
          label: 'Select Field',
          value: '',
          options: ['Option 1', 'Option 2', 'Option 3'],
        },
        displayComponent: 'SheetSelectInput',
      },
      {
        type: 'SheetTextArea',
        name: 'Text Area',
        icon: 'notes',
        defaultProps: {
          label: 'Text Area',
          value: '',
          placeholder: 'Enter text...',
        },
        displayComponent: 'SheetTextArea',
      },
    ],
  },
  {
    name: 'Display Elements',
    components: [
      {
        type: 'SheetLabel',
        name: 'Label',
        icon: 'label',
        defaultProps: {
          label: 'Label',
          value: 'Sample Label',
        },
        displayComponent: 'SheetLabel',
      },
      {
        type: 'SheetImage',
        name: 'Image',
        icon: 'image',
        defaultProps: {
          label: 'Image',
          src: '',
          alt: 'Image description',
        },
        displayComponent: 'SheetImage',
      },
    ],
  },
  {
    name: 'Interactive Elements',
    components: [
      {
        type: 'SheetCheckbox',
        name: 'Checkbox',
        icon: 'check_box',
        defaultProps: {
          label: 'Checkbox',
          value: false,
        },
        displayComponent: 'SheetCheckbox',
      },
    ],
  },
];

const onDragStart = (event: DragEvent, component: ComponentDefinition) => {
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.setData('componentType', component.type);
    event.dataTransfer.setData(
      'componentProps',
      JSON.stringify(component.defaultProps),
    );
    event.dataTransfer.setData('componentName', component.name);
    event.dataTransfer.effectAllowed = 'copy';
  }
};
</script>

<style scoped>
.component-palette {
  width: 250px;
  padding: 1rem;
  border-right: 1px solid #ddd;
  background-color: #f9f9f9;
  height: 100%;
  overflow-y: auto;
}

.draggable-component {
  cursor: grab;
  user-select: none;
}

.draggable-component:active {
  cursor: grabbing;
}
</style>
