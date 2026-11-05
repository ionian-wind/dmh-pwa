import { ref } from 'vue';

const isImporting = ref(false);

export function useJukeboxImporting() {
  return isImporting;
}
