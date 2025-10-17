<template>
  <div class="property-panel q-pa-md">
    <b class="q-mb-md">Properties</b>

    <div v-if="!selectedComponent" class="no-selection">
      <p>Select a component to edit its properties</p>
    </div>

    <div v-else class="property-form">
      <div class="q-mb-md">
        <QInput
          v-model="localProperties.name"
          label="Component Name"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md">
        <QInput v-model="localProperties.label" label="Label" outlined dense />
      </div>

      <div class="q-mb-md" v-if="localProperties.placeholder !== undefined">
        <QInput
          v-model="localProperties.placeholder"
          label="Placeholder"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md" v-if="localProperties.value !== undefined">
        <QInput
          v-if="isTextProperty('value')"
          v-model="localProperties.value"
          label="Value"
          outlined
          dense
        />
        <QInput
          v-else-if="isNumberProperty('value')"
          v-model.number="localProperties.value"
          label="Value"
          type="number"
          outlined
          dense
        />
        <QSelect
          v-else-if="isSelectProperty('value')"
          v-model="localProperties.value"
          :options="localProperties.options || []"
          label="Value"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md" v-if="localProperties.options !== undefined">
        <QInput
          v-model="optionsString"
          label="Options (comma-separated)"
          outlined
          dense
          @blur="updateOptionsFromText"
        />
      </div>

      <div class="q-mb-md" v-if="localProperties.min !== undefined">
        <QInput
          v-model.number="localProperties.min"
          label="Minimum Value"
          type="number"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md" v-if="localProperties.max !== undefined">
        <QInput
          v-model.number="localProperties.max"
          label="Maximum Value"
          type="number"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md" v-if="localProperties.step !== undefined">
        <QInput
          v-model.number="localProperties.step"
          label="Step"
          type="number"
          outlined
          dense
        />
      </div>

      <div class="q-mb-md">
        <QToggle
          v-model="localProperties.outlined"
          label="Outlined Style"
          left-label
        />
      </div>

      <div class="q-mb-md">
        <QToggle
          v-model="localProperties.dense"
          label="Dense Style"
          left-label
        />
      </div>

      <div class="q-mb-md">
        <QToggle
          v-model="localProperties.readonly"
          label="Read Only"
          left-label
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import type { LayoutItem } from '@/sheets/types/sheet.types';

interface Props {
  selectedComponent: LayoutItem | null;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update:properties', properties: Record<string, any>): void;
}>();

// Local copy of properties to manage changes
const localProperties = ref<Record<string, any>>({});

// Handle changes to selected component
watch(
  () => props.selectedComponent,
  (newComponent) => {
    if (newComponent) {
      localProperties.value = { ...newComponent.properties };
    } else {
      localProperties.value = {};
    }
  },
  { immediate: true },
);

// Watch for changes to local properties and emit update
watch(
  localProperties,
  (newProps) => {
    if (props.selectedComponent) {
      emit('update:properties', newProps);
    }
  },
  { deep: true },
);

// Handle options as a comma-separated string for easier editing
const optionsString = computed({
  get: () => {
    if (
      !localProperties.value.options ||
      !Array.isArray(localProperties.value.options)
    ) {
      return '';
    }

    // If options is an array of objects, extract the labels/values
    if (
      localProperties.value.options.length > 0 &&
      typeof localProperties.value.options[0] === 'object'
    ) {
      return localProperties.value.options
        .map((opt: any) => opt.label || opt.value || opt)
        .join(', ');
    }

    return localProperties.value.options.join(', ');
  },
  set: (value) => {
    const options = value
      .split(',')
      .map((opt) => opt.trim())
      .filter((opt) => opt !== '');
    localProperties.value.options = options;
  },
});

// Helper function to determine property type for appropriate input
const isTextProperty = (propName: string): boolean => {
  const value = localProperties.value[propName];
  return typeof value === 'string' && !Array.isArray(value);
};

const isNumberProperty = (propName: string): boolean => {
  const value = localProperties.value[propName];
  return typeof value === 'number';
};

const isSelectProperty = (propName: string): boolean => {
  const value = localProperties.value[propName];
  return propName === 'value' && Array.isArray(localProperties.value.options);
};

// Update options from text input
const updateOptionsFromText = () => {
  if (!optionsString.value) {
    localProperties.value.options = [];
    return;
  }

  const options = optionsString.value
    .split(',')
    .map((opt) => opt.trim())
    .filter((opt) => opt !== '');
  localProperties.value.options = options;
};
</script>

<style scoped>
.property-panel {
  width: 300px;
  border-left: 1px solid #ddd;
  background-color: #f9f9f9;
  height: 100%;
  overflow-y: auto;
}

.no-selection {
  text-align: center;
  padding: 2rem 0;
  color: #888;
}

.property-form {
  min-width: 280px;
}
</style>
