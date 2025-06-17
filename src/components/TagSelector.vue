<script setup lang="ts">
import { ref, computed } from 'vue';
import { withDefaults } from 'vue';
import Button from './Button.vue';

const props = withDefaults(defineProps<{
  modelValue: string[];
  placeholder?: string;
}>(), {
  modelValue: () => [],
  placeholder: 'Add tag'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const newTag = ref('');

const addTag = () => {
  if (newTag.value.trim() && !props.modelValue.includes(newTag.value.trim())) {
    const updatedTags = [...props.modelValue, newTag.value.trim()];
    emit('update:modelValue', updatedTags);
    newTag.value = '';
  }
};

const removeTag = (index: number) => {
  const updatedTags = [...props.modelValue];
  updatedTags.splice(index, 1);
  emit('update:modelValue', updatedTags);
};
</script>

<template>
  <div class="tag-selector">
    <div class="tag-input">
      <input
        v-model="newTag"
        :placeholder="placeholder || 'Add tag'"
        @keydown.enter.prevent="addTag"
      >
      <Button size="small" @click.prevent="addTag">+</Button>
    </div>

    <div class="tags-list">
      <span v-for="(tag, index) in modelValue" :key="index" class="tag">
        {{ tag }}
        <Button size="small" variant="danger" @click="removeTag(index)">×</Button>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tag-selector {
  margin-bottom: 1rem;
}

.tag-input {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.tag-input input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: var(--border-radius);
  background: var(--color-background);
  color: var(--color-text);
  font-size: 1rem;
}

.tag-input button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: var(--border-radius);
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.2s;
}

.tag-input button:hover {
  background: var(--color-primary-dark);
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: var(--color-background-soft);
  padding: 0.25rem 0.75rem;
  border-radius: var(--border-radius);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text);
  font-size: 0.9rem;
}

.tag button {
  background: none;
  border: none;
  color: var(--color-text-light);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  transition: color 0.2s;
}

.tag button:hover {
  color: var(--color-danger);
}
</style>
