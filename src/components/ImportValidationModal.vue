<template>
  <BaseModal
    :isOpen="isOpen"
    modalId="import-validation-modal"
    :title="t('importValidation.title')"
    showClose
    :submitLabel="t('common.import')"
    :cancelLabel="t('common.cancel')"
    :showSubmit="true"
    :showCancel="true"
    :disableSubmit="
      !result.treeMatchesModule || result.missingNoteIds.length > 0
    "
    @cancel="$emit('cancel')"
    @submit="$emit('import')"
  >
    <div v-if="result.treeMatchesModule" class="text-success mb-3">
      <IconCircleCheck class="icon align-middle me-1" /> {{ t('importValidation.treeMatches') }}
    </div>
    <div v-else class="text-danger mb-3">
      <IconX class="icon align-middle me-1" /> {{ t('importValidation.treeMismatch') }}
    </div>

    <div class="mb-3">
      <strong>{{ t('importValidation.missingNoteIds') }}</strong>
      <ul v-if="result.missingNoteIds.length > 0">
        <li
          v-for="id in result.missingNoteIds.slice(0, 10)"
          :key="id"
          class="text-danger"
        >
          <IconX class="icon align-middle me-1" /> {{ id }}
        </li>
        <li v-if="result.missingNoteIds.length > 10">
          {{ t('importValidation.andMore', { count: result.missingNoteIds.length - 10 }) }}
        </li>
      </ul>
      <div v-else class="text-success">
        <IconCircleCheck class="icon align-middle me-1" /> {{ t('importValidation.allNoteIdsPresent') }}
      </div>
    </div>

    <div>
      <strong>{{ t('importValidation.orphanedNoteFiles') }}</strong>
      <ul v-if="result.orphanedNoteFiles.length > 0">
        <li
          v-for="id in result.orphanedNoteFiles.slice(0, 10)"
          :key="id"
          class="text-warning"
        >
          <IconAlertTriangle class="icon align-middle me-1" /> {{ id }}
        </li>
        <li v-if="result.orphanedNoteFiles.length > 10">
          {{ t('importValidation.andMore', { count: result.orphanedNoteFiles.length - 10 }) }}
        </li>
      </ul>
      <div v-else class="text-success">
        <IconCircleCheck class="icon align-middle me-1" /> {{ t('importValidation.allNoteFilesReferenced') }}
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import type { ImportValidationResult } from '@/utils/moduleImportExport';
import BaseModal from './common/BaseModal.vue';
import { IconCircleCheck, IconX, IconAlertTriangle } from '@tabler/icons-vue';

const { t } = useI18n();

defineProps<{
  result: ImportValidationResult;
  isOpen: boolean;
}>();

defineEmits(['cancel', 'import']);
</script>
