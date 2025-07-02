<template>
  <BaseModal
    :isOpen="isOpen"
    modalId="import-validation-modal"
    title="Import Validation Results"
    showClose
    submitLabel="Import"
    cancelLabel="Cancel"
    :showSubmit="true"
    :showCancel="true"
    :disableSubmit="!result.treeMatchesModule || result.missingNoteIds.length > 0"
    @cancel="$emit('cancel')"
    @submit="$emit('import')"
  >
    <div v-if="result.treeMatchesModule" class="text-success mb-3">
      <IconCircleCheck class="icon align-middle me-1" /> Tree structure in module.json matches tree.json
    </div>
    <div v-else class="text-danger mb-3">
      <IconX class="icon align-middle me-1" /> Tree structure in module.json does not match tree.json
    </div>

    <div class="mb-3">
      <strong>Missing noteIds in notes folder:</strong>
      <ul v-if="result.missingNoteIds.length > 0">
        <li v-for="id in result.missingNoteIds.slice(0, 10)" :key="id" class="text-danger">
          <IconX class="icon align-middle me-1" /> {{ id }}
        </li>
        <li v-if="result.missingNoteIds.length > 10">...and {{ result.missingNoteIds.length - 10 }} more</li>
      </ul>
      <div v-else class="text-success">
        <IconCircleCheck class="icon align-middle me-1" /> All noteIds in tree have corresponding note files
      </div>
    </div>

    <div>
      <strong>Orphaned note files (not referenced in tree):</strong>
      <ul v-if="result.orphanedNoteFiles.length > 0">
        <li v-for="id in result.orphanedNoteFiles.slice(0, 10)" :key="id" class="text-warning">
          <IconAlertTriangle class="icon align-middle me-1" /> {{ id }}
        </li>
        <li v-if="result.orphanedNoteFiles.length > 10">...and {{ result.orphanedNoteFiles.length - 10 }} more</li>
      </ul>
      <div v-else class="text-success">
        <IconCircleCheck class="icon align-middle me-1" /> All note files are referenced in the tree
      </div>
    </div>
  </BaseModal>
</template>

<script setup lang="ts">
import type { ImportValidationResult } from '@/utils/moduleImportExport';
import BaseModal from './common/BaseModal.vue';
import { IconCircleCheck, IconX, IconAlertTriangle } from '@tabler/icons-vue';

defineProps<{
  result: ImportValidationResult;
  isOpen: boolean;
}>();

defineEmits(['cancel', 'import']);
</script>
