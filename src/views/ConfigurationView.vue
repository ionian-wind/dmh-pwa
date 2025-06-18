<template>
  <div class="configuration-view">
    <h1>Configuration</h1>
    <div class="section">
      <h2>Storage Management</h2>
      <div class="storage-info">
        <div class="info-item">
          <span class="label">Current Storage Size:</span>
          <span class="value">{{ (storageInfo.size / 1024).toFixed(2) }} KB</span>
        </div>
        <div class="info-item">
          <span class="label">Total Items:</span>
          <span class="value">{{ storageInfo.itemCount }}</span>
        </div>
      </div>
      <div class="storage-contents">
        <h3>Storage Contents</h3>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Size</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in storageContents" :key="item.key">
                <td class="key-cell">{{ item.key }}</td>
                <td class="size-cell">{{ (item.size / 1024).toFixed(2) }} KB</td>
                <td class="value-cell">
                  <pre>{{ item.value }}</pre>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="danger-zone">
        <h3>Danger Zone</h3>
        <p class="warning">
          Warning: Clearing storage will permanently delete all your data. This action cannot be undone.
        </p>
        
        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="showConfirmDialog" class="confirm-dialog">
          <p>Are you sure you want to clear all data? This action cannot be undone.</p>
          <div class="confirm-actions">
            <Button 
              variant="danger"
              @click="handleClearStorage" 
              :disabled="isClearing"
              :loading="isClearing"
            >
              {{ isClearing ? 'Clearing...' : 'Yes, Clear All Data' }}
            </Button>
            <Button 
              variant="secondary"
              @click="showConfirmDialog = false" 
              :disabled="isClearing"
            >
              Cancel
            </Button>
          </div>
        </div>
        
        <Button 
          v-else
          variant="danger"
          @click="handleClearStorage" 
        >
          Clear All Data
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { getStorageInfo, clearStorage, getStorageKeys } from '@/utils/storage';
import Button from '@/components/common/Button.vue';

const storageInfo = ref({ size: 0, itemCount: 0 });
const showConfirmDialog = ref(false);
const isClearing = ref(false);
const error = ref<string | null>(null);
const storageContents = ref<Array<{ key: string; value: string; size: number }>>([]);

// Import idbGet from storage util (not exported, so redefine here)
const DB_NAME = 'dmh-db';
const STORE_NAME = 'keyval';
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const updateStorageInfo = async () => {
  try {
    storageInfo.value = await getStorageInfo();
    error.value = null;
    storageContents.value = [];
    const keys = await getStorageKeys();
    for (const key of keys) {
      const value = await idbGet(key);
      let strValue = '';
      let size = 0;
      try {
        strValue = JSON.stringify(value, null, 2);
        size = strValue.length;
      } catch {
        strValue = String(value);
        size = strValue.length;
      }
      storageContents.value.push({ key, value: strValue, size });
    }
    storageContents.value.sort((a, b) => a.key.localeCompare(b.key));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to get storage info';
  }
};

const handleClearStorage = async () => {
  if (!showConfirmDialog.value) {
    showConfirmDialog.value = true;
    return;
  }
  try {
    isClearing.value = true;
    error.value = null;
    await clearStorage();
    await updateStorageInfo();
    showConfirmDialog.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to clear storage';
  } finally {
    isClearing.value = false;
  }
};

onMounted(() => {
  updateStorageInfo();
});
</script>

<style scoped>
.configuration-view {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  margin: 0;
  color: #333;
}

h2 {
  margin: 0 0 20px 0;
  color: #444;
}

h3 {
  margin: 0 0 10px 0;
  color: #666;
}

.storage-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f5f5f5;
  border-radius: 4px;
}

.info-item {
  margin: 5px 0;
  color: #666;
}

.storage-contents {
  margin: 20px 0;
}

.table-container {
  overflow-x: auto;
  background: #f5f5f5;
  border-radius: 4px;
  border: 1px solid #ddd;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-family: monospace;
}

th, td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #ddd;
}

th {
  background: #f5f5f5;
  font-weight: bold;
  color: #333;
}

.key-cell {
  min-width: 150px;
  max-width: 200px;
  word-break: break-all;
}

.size-cell {
  min-width: 100px;
  text-align: right;
}

.value-cell {
  min-width: 300px;
}

.value-cell pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 0.9rem;
  color: #333;
  background: #f5f5f5;
  padding: 0.5rem;
  border-radius: 4px;
  max-height: 200px;
  overflow-y: auto;
}

.danger-zone {
  margin-top: 30px;
  padding: 20px;
  background: #fff3f3;
  border: 1px solid #ffcdd2;
  border-radius: 4px;
}

.warning {
  color: #d32f2f;
  margin-bottom: 15px;
}

.error-message {
  background: #ffcdd2;
  color: #d32f2f;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.confirm-dialog {
  background: #fff3f3;
  padding: 15px;
  border-radius: 4px;
  margin-top: 10px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
</style> 
