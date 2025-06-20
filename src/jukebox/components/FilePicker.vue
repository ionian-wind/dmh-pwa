<template>
  <div>
    <button v-if="isFSAAAvailable()" @click="pickFSAA">Pick Files (Fast, Persistent)</button>
    <input v-else type="file" multiple accept="audio/mp3,audio/mpeg" @change="onChange" />
    <div v-if="!isFSAAAvailable()" class="warning">
      Files will only be available until you reload or close the page. For persistent access, use Chrome or Edge.
    </div>
  </div>
</template>
<script setup lang="ts">
import { useFileSystem } from '../composables/useFileSystem'
const emit = defineEmits(['files'])

const { pickFilesFSAA, isFSAAAvailable } = useFileSystem()

function onChange(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (files) emit('files', Array.from(files))
}
async function pickFSAA() {
  const files = await pickFilesFSAA()
  if (files.length) emit('files', files)
}
</script>
<style scoped>
.warning {
  color: #b85c00;
  font-size: 0.95em;
  margin-top: 0.5em;
}
</style> 