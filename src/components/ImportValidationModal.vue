<template>
  <div class="modal-backdrop">
    <div class="modal">
      <h2>Import Validation Results</h2>
      <div v-if="result.treeMatchesModule" class="success">✅ Tree structure in module.json matches tree.json</div>
      <div v-else class="error">❌ Tree structure in module.json does not match tree.json</div>

      <div>
        <p><strong>Missing noteIds in notes folder:</strong></p>
        <ul v-if="result.missingNoteIds.length > 0">
          <li v-for="id in result.missingNoteIds.slice(0, 10)" :key="id">❌ {{ id }}</li>
          <li v-if="result.missingNoteIds.length > 10">...and {{ result.missingNoteIds.length - 10 }} more</li>
        </ul>
        <div v-else>✅ All noteIds in tree have corresponding note files</div>
      </div>

      <div>
        <p><strong>Orphaned note files (not referenced in tree):</strong></p>
        <ul v-if="result.orphanedNoteFiles.length > 0">
          <li v-for="id in result.orphanedNoteFiles.slice(0, 10)" :key="id">⚠️ {{ id }}</li>
          <li v-if="result.orphanedNoteFiles.length > 10">...and {{ result.orphanedNoteFiles.length - 10 }} more</li>
        </ul>
        <div v-else>✅ All note files are referenced in the tree</div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('import')" :disabled="!result.treeMatchesModule || result.missingNoteIds.length > 0">Import</button>
        <button @click="$emit('cancel')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ImportValidationResult } from '@/utils/moduleImportExport';

defineProps<{
  result: ImportValidationResult;
}>();
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 8px;
  padding: 2rem;
  min-width: 350px;
  max-width: 90vw;
  box-shadow: 0 2px 16px rgba(0,0,0,0.2);
}
.success { color: #2e7d32; margin-bottom: 1em; }
.error { color: #c62828; margin-bottom: 1em; }
.modal-actions {
  display: flex;
  gap: 1em;
  margin-top: 2em;
  justify-content: flex-end;
}
button {
  padding: 0.5em 1.5em;
  border-radius: 4px;
  border: none;
  font-size: 1em;
  cursor: pointer;
}
button:disabled {
  background: #eee;
  color: #aaa;
  cursor: not-allowed;
}
</style> 