<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { IconX } from '@tabler/icons-vue';

const props = defineProps<{
  modelValue: string[];
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
  <div class="column q-gutter-sm q-mb-md">
    <div class="row items-center q-gutter-sm">
      <QInput
        v-model="newTag"
        :label="t('editor.tags')"
        :placeholder="t('tagSelector.addTag')"
        @keydown.enter.prevent="addTag"
        outlined
        class="col"
      />
      <QBtn
        flat
        color="primary"
        :label="t('tagSelector.add')"
        @click.prevent="addTag"
      />
    </div>

    <div v-if="modelValue.length > 0" class="row q-gutter-xs">
      <QChip dense v-for="(tag, index) in modelValue" :key="index">
        {{ tag }}
        <IconX @click="removeTag(index)" />
      </QChip>
    </div>
  </div>
</template>
