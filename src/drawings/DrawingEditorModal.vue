<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import BaseModal from '@/components/common/BaseModal.vue';
import NoteCanvas from '@/notes/NoteCanvas.vue';
import type { Drawing } from '@/types';

const props = defineProps<{
  isOpen: boolean;
  drawing?: Drawing | null;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: { snapshot: string; preview: string }): void;
  (e: 'cancel'): void;
}>();

const { t } = useI18n();
const canvasRef = ref<InstanceType<typeof NoteCanvas> | null>(null);

async function handleSubmit() {
  const snapshot = canvasRef.value?.getSnapshot?.() ?? '';
  const preview = (await canvasRef.value?.getPreview?.()) || '';
  emit('submit', { snapshot, preview });
}
</script>

<template>
  <BaseModal
    :isOpen="props.isOpen"
    :title="props.drawing ? t('drawing.edit') : t('drawing.add')"
    :showSubmit="true"
    :showCancel="true"
    :showExpand="true"
    :fill-content="true"
    :submitLabel="t('common.ok')"
    :cancelLabel="t('common.cancel')"
    modal-id="drawing-editor-modal"
    @submit="handleSubmit"
    @cancel="emit('cancel')"
  >
    <template #main>
      <NoteCanvas
        ref="canvasRef"
        :model-value="props.drawing?.snapshot ?? ''"
        fill
      />
    </template>
  </BaseModal>
</template>
