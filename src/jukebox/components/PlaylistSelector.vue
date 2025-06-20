<template>
  <div class="playlist-selector">
    <select v-model="selectedId" @change="onSelect">
      <option v-for="p in playlists" :key="p.id" :value="p.id">{{ p.name }}</option>
    </select>
    <button @click="showCreate = true">New</button>
    <button :disabled="!selectedId" @click="showRename = true">Rename</button>
    <button :disabled="!selectedId" @click="$emit('delete', selectedId)">Delete</button>

    <div v-if="showCreate" class="modal">
      <input v-model="newName" placeholder="Playlist name" />
      <button @click="create">Create</button>
      <button @click="showCreate = false">Cancel</button>
    </div>
    <div v-if="showRename" class="modal">
      <input v-model="renameName" placeholder="New name" />
      <button @click="rename">Rename</button>
      <button @click="showRename = false">Cancel</button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ playlists: any[]; activeId: string | null }>()
const emit = defineEmits(['select', 'create', 'rename', 'delete'])
const selectedId = ref(props.activeId)
const showCreate = ref(false)
const showRename = ref(false)
const newName = ref('')
const renameName = ref('')

watch(() => props.activeId, id => selectedId.value = id)

function onSelect() {
  emit('select', selectedId.value)
}
function create() {
  if (newName.value.trim()) {
    emit('create', newName.value.trim())
    newName.value = ''
    showCreate.value = false
  }
}
function rename() {
  if (renameName.value.trim() && selectedId.value) {
    emit('rename', { id: selectedId.value, name: renameName.value.trim() })
    renameName.value = ''
    showRename.value = false
  }
}
</script>
<style scoped>
.playlist-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
select {
  min-width: 120px;
}
.modal {
  position: absolute;
  background: #fff;
  border: 1px solid #ccc;
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  z-index: 10;
}
</style> 