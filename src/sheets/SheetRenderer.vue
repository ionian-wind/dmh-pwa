<script setup lang="ts">
import { computed } from 'vue';
import type { Sheet } from '@/sheets/types/sheet.types';
import SheetTextInput from '@/sheets/components/SheetComponents/SheetTextInput.vue';
import SheetNumberInput from '@/sheets/components/SheetComponents/SheetNumberInput.vue';
import SheetSelectInput from '@/sheets/components/SheetComponents/SheetSelectInput.vue';
import SheetLabel from '@/sheets/components/SheetComponents/SheetLabel.vue';
import SheetImage from '@/sheets/components/SheetComponents/SheetImage.vue';
import SheetCheckbox from '@/sheets/components/SheetComponents/SheetCheckbox.vue';
import SheetTextArea from '@/sheets/components/SheetComponents/SheetTextArea.vue';

interface Props {
  sheet: Sheet;
  readonly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  readonly: false,
});

// For now, this is a basic renderer - it will be expanded in later steps
const components = computed(() => {
  return props.sheet.layout || [];
});

// Component mapping for dynamic component rendering
const componentMap: Record<string, any> = {
  SheetTextInput: SheetTextInput,
  SheetNumberInput: SheetNumberInput,
  SheetSelectInput: SheetSelectInput,
  SheetLabel: SheetLabel,
  SheetImage: SheetImage,
  SheetCheckbox: SheetCheckbox,
  SheetTextArea: SheetTextArea,
  // More components will be added here as they're implemented
};

// Get the component to render based on the type
const getComponent = (componentType: string) => {
  return componentMap[componentType] || 'div';
};
</script>

<template>
  <div class="sheet-renderer">
    <h2>{{ sheet.name }}</h2>
    <div class="sheet-layout">
      <div
        v-for="component in components"
        :key="component.id"
        class="layout-component"
        :style="{
          gridColumn: `${component.x + 1} / span ${component.width}`,
          gridRow: `${component.y + 1} / span ${component.height}`,
        }"
      >
        <component
          :is="getComponent(component.componentType)"
          v-bind="component.properties"
          :readonly="readonly"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sheet-renderer {
  padding: 1rem;
}

.sheet-layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-gap: 0.5rem;
  min-height: 500px;
  background-color: #f5f5f5;
  padding: 1rem;
  border-radius: 4px;
}

.layout-component {
  border: 1px solid #ccc;
  padding: 0.5rem;
  background-color: white;
  border-radius: 4px;
}
</style>
