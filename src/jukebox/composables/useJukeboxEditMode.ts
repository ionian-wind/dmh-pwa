import { ref } from 'vue';

const isEditMode = ref(false);

export function useJukeboxEditMode() {
  return isEditMode;
}
