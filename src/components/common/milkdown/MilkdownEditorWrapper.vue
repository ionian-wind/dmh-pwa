<template>
    <MilkdownProvider>
    <MilkdownEditor
      :model-value="modelValue"
      :current-entity-type="props.currentEntityType || ''"
      :current-entity-id="props.currentEntityId || ''"
      @update:modelValue="emit('update:modelValue', $event)"
    />
    </MilkdownProvider>
</template>

<script setup lang="ts">
import { MilkdownProvider } from "@milkdown/vue";
import MilkdownEditor from "./MilkdownEditor.vue";

const props = defineProps<{ modelValue: string; currentEntityType?: string; currentEntityId?: string }>();
const emit = defineEmits(["update:modelValue"]);
</script>