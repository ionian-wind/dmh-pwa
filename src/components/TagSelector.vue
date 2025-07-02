<script setup lang="ts">
import { ref, computed } from 'vue';
import Button from '@/components/common/Button.vue';
import { useI18n } from 'vue-i18n';

const props = defineProps<{
  modelValue: string[];
  placeholder?: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void;
}>();

const { t } = useI18n();

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
        :placeholder="placeholder || t('tagSelector.addTag')"
        @keydown.enter.prevent="addTag"
      >
      <Button size="small" variant="light" @click.prevent="addTag">{{ t('tagSelector.add') }}</Button>
    </div>

    <div class="tags-list">
      <span v-for="(tag, index) in modelValue" :key="index" class="tag">
        {{ tag }}
        <Button size="small" variant="light" @click="removeTag(index)">{{ t('tagSelector.remove') }}</Button>
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
</style>
