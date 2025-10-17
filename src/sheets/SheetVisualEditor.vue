<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Sheet, LayoutItem } from '@/sheets/types/sheet.types';
import ComponentPalette from '@/sheets/components/SheetEditor/ComponentPalette.vue';
import PropertyPanel from '@/sheets/components/SheetEditor/PropertyPanel.vue';
import { useI18n } from 'vue-i18n';
import { nanoid } from 'nanoid';

interface Props {
  sheet: Sheet;
}

interface Emits {
  (e: 'update:sheet', sheet: Sheet): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

const localSheet = ref<Sheet>({ ...props.sheet });
const selectedComponent = ref<LayoutItem | null>(null);

// Sync localSheet with props.sheet when it changes
watch(
  () => props.sheet,
  (newSheet) => {
    localSheet.value = { ...newSheet };
    selectedComponent.value = null;
  },
);

// Handle drag over event
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

// Handle drop event to add component to layout
function handleDrop(event: DragEvent) {
  event.preventDefault();
  event.stopPropagation();

  const componentType = event.dataTransfer?.getData('componentType');
  const componentProps = event.dataTransfer?.getData('componentProps');
  const componentName = event.dataTransfer?.getData('componentName');

  if (componentType && componentProps) {
    // Get the drop zone element
    const dropZone = event.currentTarget as HTMLElement;
    if (!dropZone) return;

    // Calculate position relative to the drop zone
    const rect = dropZone.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / 60); // Approximate grid cell width
    const y = Math.floor((event.clientY - rect.top) / 60); // Approximate grid cell height

    const layoutItem: LayoutItem = {
      id: nanoid(),
      componentType,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: 3, // Default width
      height: 2, // Default height
      properties: JSON.parse(componentProps),
      name: componentName || componentType,
    };

    localSheet.value.layout.push(layoutItem);
    emit('update:sheet', { ...localSheet.value, updatedAt: Date.now() });
  }
}

// Handle component selection
function handleComponentSelect(component: LayoutItem) {
  selectedComponent.value = component;
}

// Handle property update
function handlePropertyUpdate(properties: Record<string, any>) {
  if (selectedComponent.value) {
    const index = localSheet.value.layout.findIndex(
      (item) => item.id === selectedComponent.value?.id,
    );
    if (index !== -1) {
      // Update the properties of the selected component
      localSheet.value.layout[index] = {
        ...selectedComponent.value,
        properties: { ...properties },
      };
      // Update our reference
      selectedComponent.value = localSheet.value.layout[index];
      emit('update:sheet', { ...localSheet.value, updatedAt: Date.now() });
    }
  }
}

// Handle component deletion
function handleDeleteComponent() {
  if (selectedComponent.value) {
    localSheet.value.layout = localSheet.value.layout.filter(
      (item) => item.id !== selectedComponent.value?.id,
    );
    selectedComponent.value = null;
    emit('update:sheet', { ...localSheet.value, updatedAt: Date.now() });
  }
}
</script>

<template>
  <div class="visual-editor-container">
    <div class="editor-container full-width full-height">
      <!-- Component Palette -->
      <ComponentPalette class="component-palette" />

      <!-- Main Editor Area -->
      <div
        class="editor-workspace"
        @dragover="handleDragOver"
        @drop="handleDrop"
      >
        <div class="grid-layout">
          <div
            v-for="component in localSheet.layout"
            :key="component.id"
            class="layout-component"
            :class="{ selected: selectedComponent?.id === component.id }"
            :style="{
              gridColumn: `${component.x + 1} / span ${component.width}`,
              gridRow: `${component.y + 1} / span ${component.height}`,
            }"
            @click="handleComponentSelect(component)"
          >
            <div class="component-header">
              <span class="component-name">{{
                component.name || component.componentType
              }}</span>
              <QIcon
                name="close"
                class="delete-icon"
                @click.stop="
                  () => {
                    if (selectedComponent?.id === component.id)
                      selectedComponent = null;
                    localSheet.layout = localSheet.layout.filter(
                      (item) => item.id !== component.id,
                    );
                    emit('update:sheet', {
                      ...localSheet,
                      updatedAt: Date.now(),
                    });
                  }
                "
              />
            </div>
            <div class="component-preview">
              <component
                :is="component.componentType"
                v-bind="component.properties"
                readonly
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Property Panel -->
      <PropertyPanel
        v-if="selectedComponent"
        class="property-panel"
        :selected-component="selectedComponent"
        @update:properties="handlePropertyUpdate"
      />
    </div>
  </div>
</template>

<style scoped>
.visual-editor-container {
  display: flex;
  height: 100vh;
  min-height: 600px;
}

.editor-container {
  display: flex;
  height: 100%;
  width: 100%;
}

.component-palette {
  width: 250px;
  padding: 1rem;
  border-right: 1px solid #ddd;
  background-color: #f9f9f9;
  height: 100%;
  overflow-y: auto;
}

.editor-workspace {
  flex: 1;
  padding: 1rem;
  background-color: #f0f0f0;
  overflow: auto;
  border: 1px dashed #ccc;
  position: relative;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(
    20,
    minmax(40px, auto)
  ); /* 20 rows minimum height 40px */
  gap: 5px;
  min-height: 100%;
}

.layout-component {
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem;
  position: relative;
  display: flex;
  flex-direction: column;
}

.layout-component.selected {
  border: 2px solid #1976d2;
  box-shadow: 0 0 5px rgba(25, 118, 210, 0.5);
}

.component-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #eee;
  margin-bottom: 0.25rem;
}

.component-name {
  font-weight: bold;
  font-size: 0.85rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.delete-icon {
  cursor: pointer;
  color: #999;
  font-size: 1rem;
}

.delete-icon:hover {
  color: #f44336;
}

.component-preview {
  flex: 1;
  overflow: hidden;
}

.property-panel {
  width: 300px;
  border-left: 1px solid #ddd;
  background-color: #f9f9f9;
  height: 100%;
  overflow-y: auto;
}
</style>
